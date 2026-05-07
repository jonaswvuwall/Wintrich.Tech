using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Orchestrates every probe in parallel and produces a single graded "Full Domain Report".
/// Used by the /api/network/full-report endpoint and by the monitoring background service.
/// </summary>
public sealed class FullReportService(
    ConnectivityService ping,
    DnsService dns,
    TlsService tls,
    HttpAnalysisService http,
    SecurityHeadersService secHeaders,
    EmailAuthService emailAuth,
    WhoisService whois,
    ILogger<FullReportService> logger)
{
    public async Task<FullReportResponse> RunAsync(string host, bool includeWhois = true, bool includeEmailAuth = true)
    {
        host = host.Trim();
        logger.LogInformation("Generating full report for {Host}", host);

        var url = $"https://{host}";

        // Fire everything in parallel — independent probes.
        var pingTask     = SafeAsync(() => ping.PingAsync(host));
        var dnsTask      = SafeAsync(() => dns.LookupAsync(host));
        var tlsTask      = SafeAsync(() => tls.InspectAsync(host));
        var httpTask     = SafeAsync(() => http.AnalyzeAsync(url));
        var secTask      = SafeAsync(() => secHeaders.AuditAsync(url));
        var emailTask    = includeEmailAuth ? SafeAsync(() => emailAuth.AuditAsync(host)) : Task.FromResult<EmailAuthResponse?>(null);
        var whoisTask    = includeWhois     ? SafeAsync(() => whois.LookupAsync(host))    : Task.FromResult<WhoisResponse?>(null);

        await Task.WhenAll(pingTask, dnsTask, tlsTask, httpTask, secTask, emailTask, whoisTask);

        var pingResult  = pingTask.Result;
        var dnsResult   = dnsTask.Result;
        var tlsResult   = tlsTask.Result;
        var httpResult  = httpTask.Result;
        var secResult   = secTask.Result;
        var emailResult = emailTask.Result;
        var whoisResult = whoisTask.Result;

        var (score, max, findings) = Grade(pingResult, dnsResult, tlsResult, httpResult, secResult, emailResult, whoisResult);
        var grade = ToLetter(score, max);
        var summary = BuildSummary(grade, score, max, findings);

        return new FullReportResponse(
            host, DateTime.UtcNow, score, max, grade, summary, findings.ToArray(),
            pingResult, dnsResult, tlsResult, httpResult, secResult, emailResult, whoisResult);
    }

    // ─── grading ────────────────────────────────────────────────────────────

    private static (int score, int max, List<ReportFinding> findings) Grade(
        PingResponse? ping, DnsResponse? dnsResp, TlsInfoResponse? tlsResp,
        HttpAnalysisResponse? httpResp, SecurityHeadersResponse? secResp,
        EmailAuthResponse? emailResp, WhoisResponse? whoisResp)
    {
        var findings = new List<ReportFinding>();
        int score = 0, max = 0;

        // Connectivity — 10 pts
        max += 10;
        if (ping is { Reachable: true }) { score += 10; }
        else findings.Add(new("critical", "Connectivity", $"Host not reachable: {ping?.Error ?? "no response"}"));

        // DNS — 15 pts (A required, AAAA bonus)
        max += 15;
        if (dnsResp != null && dnsResp.Error == null)
        {
            if (dnsResp.ARecords.Count > 0) score += 10;
            else findings.Add(new("critical", "DNS", "No A record — domain does not resolve to an IPv4 address."));

            if (dnsResp.AaaaRecords.Count > 0) score += 5;
            else findings.Add(new("info", "DNS", "No AAAA record — domain is not reachable over IPv6."));
        }
        else findings.Add(new("critical", "DNS", dnsResp?.Error ?? "DNS lookup failed"));

        // TLS — 25 pts
        max += 25;
        if (tlsResp != null && tlsResp.Error == null)
        {
            score += 15;
            var days = tlsResp.DaysUntilExpiry ?? 0;
            if (days > 30) score += 10;
            else if (days > 7) { score += 5; findings.Add(new("warning", "TLS", $"Certificate expires in {days} day(s).")); }
            else findings.Add(new("critical", "TLS", $"Certificate expires in {days} day(s) — renew immediately."));

            if (tlsResp.Protocol is "TLSv1.0" or "TLSv1.1")
                findings.Add(new("warning", "TLS", $"Outdated protocol negotiated: {tlsResp.Protocol}."));
        }
        else findings.Add(new("critical", "TLS", tlsResp?.Error ?? "No TLS certificate found"));

        // HTTP — 15 pts
        max += 15;
        if (httpResp != null && httpResp.Error == null && httpResp.Status is >= 200 and < 400)
        {
            score += 15;
            if (httpResp.ResponseTimeMs > 2000)
                findings.Add(new("warning", "HTTP", $"Slow response: {httpResp.ResponseTimeMs} ms."));
        }
        else
        {
            findings.Add(new("critical", "HTTP",
                httpResp?.Error ?? $"HTTP probe returned status {httpResp?.Status?.ToString() ?? "n/a"}"));
        }

        // Security headers — up to 25 pts (proportional to existing grade)
        max += 25;
        if (secResp != null && secResp.Error == null)
        {
            score += (int)Math.Round(25.0 * secResp.Score / Math.Max(1, secResp.MaxScore));
            foreach (var c in secResp.Checks.Where(c => c.Status != "good"))
            {
                var sev = c.Status == "missing" ? "warning" : "info";
                findings.Add(new(sev, "Security Headers", $"{c.Name}: {c.Status}."));
            }
        }
        else findings.Add(new("warning", "Security Headers", secResp?.Error ?? "Could not audit headers"));

        // Email-auth — up to 20 pts (proportional)
        max += 20;
        if (emailResp != null && emailResp.Error == null)
        {
            score += (int)Math.Round(20.0 * emailResp.Score / Math.Max(1, emailResp.MaxScore));
            foreach (var part in new[] { emailResp.Spf, emailResp.Dmarc, emailResp.Dkim }.Where(c => c.Status != "good"))
                findings.Add(new(part.Status == "missing" ? "warning" : "info", "Email Auth", $"{part.Name}: {part.Status}."));
        }

        // WHOIS — 5 pts informational
        max += 5;
        if (whoisResp != null && whoisResp.Error == null)
        {
            score += 5;
            if (whoisResp.DaysUntilExpiry is < 30 and >= 0)
                findings.Add(new("warning", "Domain", $"Domain registration expires in {whoisResp.DaysUntilExpiry} day(s)."));
            else if (whoisResp.DaysUntilExpiry is < 0)
                findings.Add(new("critical", "Domain", "Domain registration has expired."));
        }

        return (score, max, findings);
    }

    private static string ToLetter(int score, int max)
    {
        var pct = max == 0 ? 0 : (score * 100.0) / max;
        return pct switch
        {
            >= 95 => "A+",
            >= 85 => "A",
            >= 75 => "B",
            >= 65 => "C",
            >= 50 => "D",
            _     => "F"
        };
    }

    private static string BuildSummary(string grade, int score, int max, List<ReportFinding> findings)
    {
        var critical = findings.Count(f => f.Severity == "critical");
        var warnings = findings.Count(f => f.Severity == "warning");
        return $"Grade {grade} ({score}/{max}). {critical} critical, {warnings} warning issue(s).";
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private async Task<T?> SafeAsync<T>(Func<Task<T>> action) where T : class
    {
        try { return await action(); }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Sub-probe failed during full report");
            return null;
        }
    }
}
