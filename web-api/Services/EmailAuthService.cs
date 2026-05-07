using DnsClient;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Audits a domain's email-authentication posture (SPF, DMARC, and a best-effort DKIM
/// selector probe) by inspecting DNS TXT records.
/// </summary>
public sealed class EmailAuthService(ILogger<EmailAuthService> logger)
{
    // Common DKIM selectors used by major mail providers — we probe a handful so the
    // UI can show "DKIM detected via selector google._domainkey" without the user
    // having to know which selector their MTA uses.
    private static readonly string[] CommonDkimSelectors =
    [
        "google", "selector1", "selector2", "k1", "k2", "default",
        "mail", "smtp", "dkim", "mxvault", "everlytickey1", "everlytickey2",
        "s1", "s2", "mandrill", "sendgrid", "amazonses"
    ];

    private readonly LookupClient _dns = new(new LookupClientOptions
    {
        Timeout = TimeSpan.FromSeconds(5),
        UseCache = true
    });

    public async Task<EmailAuthResponse> AuditAsync(string domain)
    {
        domain = domain.Trim().ToLowerInvariant();
        logger.LogDebug("Email-auth audit for {Domain}", domain);

        try
        {
            var spf   = await CheckSpfAsync(domain);
            var dmarc = await CheckDmarcAsync(domain);
            var dkim  = await CheckDkimAsync(domain);

            var checks = new[] { spf, dmarc, dkim };
            var score = checks.Sum(ScoreOf);
            var max   = checks.Length * 30;
            var grade = ToGrade(score, max);
            var summary = BuildSummary(spf, dmarc, dkim, grade);

            return new EmailAuthResponse(domain, spf, dmarc, dkim, score, max, grade, summary, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Email-auth audit failed for {Domain}", domain);
            return new EmailAuthResponse(domain,
                new("SPF", false, null, "error", "Sender Policy Framework — declares which servers may send mail for this domain.", null),
                new("DMARC", false, null, "error", "Domain-based Message Authentication — tells receivers what to do with unauthenticated mail.", null),
                new("DKIM", false, null, "error", "DomainKeys Identified Mail — cryptographic signature on outbound messages.", null),
                0, 90, "F", "Email-auth audit failed.", ex.Message);
        }
    }

    // ─── SPF ────────────────────────────────────────────────────────────────

    private async Task<EmailAuthCheck> CheckSpfAsync(string domain)
    {
        const string desc = "Sender Policy Framework — declares which servers may send mail for this domain.";
        var txt = await GetTxtRecordsAsync(domain);
        var spf = txt.FirstOrDefault(t => t.StartsWith("v=spf1", StringComparison.OrdinalIgnoreCase));
        if (spf == null)
            return new("SPF", false, null, "missing", desc,
                ["No v=spf1 TXT record found — receivers cannot verify which servers may send for this domain."]);

        var findings = new List<string>();
        var endsWithSoftFail = spf.TrimEnd().EndsWith("~all", StringComparison.OrdinalIgnoreCase);
        var endsWithFail     = spf.TrimEnd().EndsWith("-all", StringComparison.OrdinalIgnoreCase);
        var endsWithAllow    = spf.TrimEnd().EndsWith("+all", StringComparison.OrdinalIgnoreCase);
        var endsWithNeutral  = spf.TrimEnd().EndsWith("?all", StringComparison.OrdinalIgnoreCase);

        string status;
        if (endsWithFail)        { status = "good";    findings.Add("Strict policy: -all (hard fail for unauthorised senders)."); }
        else if (endsWithSoftFail) { status = "good";  findings.Add("Soft-fail policy: ~all (recommended for most domains)."); }
        else if (endsWithNeutral)  { status = "warning"; findings.Add("Neutral policy: ?all — receivers may accept spoofed mail."); }
        else if (endsWithAllow)    { status = "warning"; findings.Add("Permissive policy: +all — anyone may send mail as your domain."); }
        else                       { status = "warning"; findings.Add("No explicit 'all' qualifier at end of record."); }

        // Crude lookup-count check — RFC 7208 caps DNS lookups at 10
        var lookups = CountSpfLookups(spf);
        if (lookups > 10) findings.Add($"Record requires {lookups} DNS lookups — exceeds RFC 7208 limit of 10.");

        return new("SPF", true, spf, status, desc, findings.ToArray());
    }

    private static int CountSpfLookups(string record)
    {
        // Mechanisms that trigger DNS lookups: include, a, mx, ptr, exists, redirect
        string[] tokens = ["include:", "a:", "mx:", "ptr", "exists:", "redirect="];
        return tokens.Sum(t => CountOccurrences(record, t));
    }

    private static int CountOccurrences(string s, string sub)
    {
        int count = 0, i = 0;
        while ((i = s.IndexOf(sub, i, StringComparison.OrdinalIgnoreCase)) != -1) { count++; i += sub.Length; }
        return count;
    }

    // ─── DMARC ──────────────────────────────────────────────────────────────

    private async Task<EmailAuthCheck> CheckDmarcAsync(string domain)
    {
        const string desc = "Domain-based Message Authentication — tells receivers what to do with mail that fails SPF or DKIM.";
        var txt = await GetTxtRecordsAsync($"_dmarc.{domain}");
        var dmarc = txt.FirstOrDefault(t => t.StartsWith("v=DMARC1", StringComparison.OrdinalIgnoreCase));
        if (dmarc == null)
            return new("DMARC", false, null, "missing", desc,
                ["No DMARC record at _dmarc." + domain + " — receivers have no policy to apply."]);

        var findings = new List<string>();
        var policy = ExtractTag(dmarc, "p") ?? "none";
        var sp     = ExtractTag(dmarc, "sp");
        var pct    = ExtractTag(dmarc, "pct") ?? "100";
        var rua    = ExtractTag(dmarc, "rua");

        string status = policy.ToLowerInvariant() switch
        {
            "reject"     => "good",
            "quarantine" => "good",
            "none"       => "warning",
            _            => "warning"
        };

        findings.Add($"Policy: p={policy}");
        if (sp != null) findings.Add($"Subdomain policy: sp={sp}");
        if (pct != "100") findings.Add($"Applied to {pct}% of mail (pct={pct}).");
        findings.Add(rua != null ? $"Aggregate reports sent to {rua}" : "No 'rua' tag — you will receive no aggregate reports.");

        if (policy.Equals("none", StringComparison.OrdinalIgnoreCase))
            findings.Add("p=none is monitor-only — spoofed mail is still delivered. Move to quarantine or reject once you trust the reports.");

        return new("DMARC", true, dmarc, status, desc, findings.ToArray());
    }

    private static string? ExtractTag(string record, string tag)
    {
        var parts = record.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var prefix = tag + "=";
        var match = parts.FirstOrDefault(p => p.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
        return match?[prefix.Length..];
    }

    // ─── DKIM ───────────────────────────────────────────────────────────────

    private async Task<EmailAuthCheck> CheckDkimAsync(string domain)
    {
        const string desc = "DomainKeys Identified Mail — outbound messages are cryptographically signed; receivers fetch the public key from DNS.";

        foreach (var selector in CommonDkimSelectors)
        {
            var txt = await GetTxtRecordsAsync($"{selector}._domainkey.{domain}");
            var dkim = txt.FirstOrDefault(t =>
                t.Contains("v=DKIM1", StringComparison.OrdinalIgnoreCase) ||
                t.Contains("k=rsa",   StringComparison.OrdinalIgnoreCase) ||
                t.Contains("p=",      StringComparison.OrdinalIgnoreCase));

            if (dkim != null)
            {
                var findings = new List<string> { $"Found via selector '{selector}'." };
                if (dkim.Contains("p=;", StringComparison.OrdinalIgnoreCase) ||
                    dkim.Contains("p=\"\"", StringComparison.OrdinalIgnoreCase))
                {
                    findings.Add("Public key is empty — selector has been revoked.");
                    return new("DKIM", true, dkim, "warning", desc, findings.ToArray());
                }
                return new("DKIM", true, dkim, "good", desc, findings.ToArray());
            }
        }

        return new("DKIM", false, null, "missing", desc,
        [
            "No DKIM record found for any common selector. " +
            "DKIM uses custom selectors (e.g. mailprovider._domainkey.example.com); " +
            "if your MTA uses a non-standard selector, this check may produce a false negative."
        ]);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private async Task<List<string>> GetTxtRecordsAsync(string name)
    {
        try
        {
            var r = await _dns.QueryAsync(name, QueryType.TXT);
            return r.Answers.TxtRecords()
                .Select(rec => string.Concat(rec.Text))
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogDebug("TXT lookup failed for {Name}: {Msg}", name, ex.Message);
            return new List<string>();
        }
    }

    private static int ScoreOf(EmailAuthCheck c) => c.Status switch
    {
        "good"    => 30,
        "warning" => 15,
        _         => 0
    };

    private static string ToGrade(int score, int max)
    {
        var pct = max == 0 ? 0 : (score * 100) / max;
        return pct switch
        {
            >= 90 => "A",
            >= 75 => "B",
            >= 60 => "C",
            >= 40 => "D",
            _     => "F"
        };
    }

    private static string BuildSummary(EmailAuthCheck spf, EmailAuthCheck dmarc, EmailAuthCheck dkim, string grade)
    {
        var missing = new List<string>();
        if (!spf.Present)   missing.Add("SPF");
        if (!dmarc.Present) missing.Add("DMARC");
        if (!dkim.Present)  missing.Add("DKIM");

        return missing.Count == 0
            ? $"Grade {grade} — all three records (SPF, DMARC, DKIM) are present."
            : $"Grade {grade} — missing: {string.Join(", ", missing)}.";
    }
}
