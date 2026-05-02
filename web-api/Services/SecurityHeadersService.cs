using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Audits a URL for the presence and quality of common HTTP security headers
/// (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
/// Permissions-Policy) and computes a letter grade.
/// </summary>
public sealed class SecurityHeadersService(
    IHttpClientFactory httpClientFactory,
    ILogger<SecurityHeadersService> logger)
{
    private const int MaxScore = 100;

    public async Task<SecurityHeadersResponse> AuditAsync(string url)
    {
        logger.LogDebug("Auditing security headers for {Url}", url);

        bool usesHttps;
        try
        {
            usesHttps = new Uri(url).Scheme.Equals("https", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return new SecurityHeadersResponse(url, null, false, 0, MaxScore, "F",
                "Invalid URL.", Array.Empty<SecurityHeaderCheck>(), "Invalid URL.");
        }

        Dictionary<string, string> headers;
        int? statusCode = null;
        try
        {
            var client = httpClientFactory.CreateClient("analysis");
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            // Send browser-like headers so sites don't return a stripped-down response
            request.Headers.UserAgent.Clear();
            request.Headers.TryAddWithoutValidation("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
            request.Headers.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            request.Headers.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.9");

            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            statusCode = (int)response.StatusCode;

            // Merge response + content headers; tolerate duplicate keys (e.g. multiple Set-Cookie)
            headers = response.Headers
                .Concat(response.Content.Headers)
                .GroupBy(h => h.Key, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key.ToLowerInvariant(),
                    g => string.Join(", ", g.SelectMany(kv => kv.Value)),
                    StringComparer.OrdinalIgnoreCase);

            logger.LogDebug("Received {Count} unique headers from {Url}: {Headers}",
                headers.Count, url, string.Join(", ", headers.Keys));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Security header audit failed for {Url}", url);
            return new SecurityHeadersResponse(url, null, usesHttps, 0, MaxScore, "F",
                "Could not reach the URL.", Array.Empty<SecurityHeaderCheck>(),
                $"Request failed: {ex.Message}");
        }

        var checks = new List<SecurityHeaderCheck>
        {
            EvaluateHsts(headers, usesHttps),
            EvaluateCsp(headers),
            EvaluateXFrameOptions(headers),
            EvaluateXContentTypeOptions(headers),
            EvaluateReferrerPolicy(headers),
            EvaluatePermissionsPolicy(headers),
            EvaluateHttps(usesHttps),
        };

        var score = checks.Sum(c => c.Score);
        var grade = ToGrade(score);
        var summary = BuildSummary(checks, score, grade);

        return new SecurityHeadersResponse(url, statusCode, usesHttps, score, MaxScore,
            grade, summary, checks.ToArray(), null);
    }

    // ─── individual checks ────────────────────────────────────────────────

    private static SecurityHeaderCheck EvaluateHsts(IDictionary<string, string> h, bool https)
    {
        const int max = 15;
        if (!https)
            return new("Strict-Transport-Security", false, null, 0, max,
                "Forces browsers to use HTTPS. Only meaningful on HTTPS origins.", "missing");

        if (h.TryGetValue("strict-transport-security", out var v))
        {
            // Look for a meaningful max-age (>= 6 months recommended)
            var maxAge = ExtractMaxAge(v);
            var status = maxAge >= 15768000 ? "good" : "warning";
            var score = maxAge >= 15768000 ? max : Math.Max(5, max / 2);
            return new("Strict-Transport-Security", true, v, score, max,
                "Tells browsers to only connect over HTTPS, preventing protocol downgrade attacks.", status);
        }
        return new("Strict-Transport-Security", false, null, 0, max,
            "Tells browsers to only connect over HTTPS, preventing protocol downgrade attacks.", "missing");
    }

    private static SecurityHeaderCheck EvaluateCsp(IDictionary<string, string> h)
    {
        const int max = 25;
        if (h.TryGetValue("content-security-policy", out var v))
        {
            var weak = v.Contains("unsafe-inline", StringComparison.OrdinalIgnoreCase)
                       || v.Contains("unsafe-eval", StringComparison.OrdinalIgnoreCase);
            var score = weak ? max / 2 : max;
            var status = weak ? "warning" : "good";
            return new("Content-Security-Policy", true, v, score, max,
                "Restricts which scripts, styles and resources the browser is allowed to load — the strongest defence against XSS.",
                status);
        }
        return new("Content-Security-Policy", false, null, 0, max,
            "Restricts which scripts, styles and resources the browser is allowed to load — the strongest defence against XSS.",
            "missing");
    }

    private static SecurityHeaderCheck EvaluateXFrameOptions(IDictionary<string, string> h)
    {
        const int max = 10;
        // Modern equivalent is CSP frame-ancestors, but X-Frame-Options is still widely deployed.
        if (h.TryGetValue("x-frame-options", out var v))
            return new("X-Frame-Options", true, v, max, max,
                "Prevents your site from being embedded in an iframe on another site (clickjacking protection).", "good");

        if (h.TryGetValue("content-security-policy", out var csp)
            && csp.Contains("frame-ancestors", StringComparison.OrdinalIgnoreCase))
            return new("X-Frame-Options", true, "(via CSP frame-ancestors)", max, max,
                "Prevents your site from being embedded in an iframe on another site (clickjacking protection).", "good");

        return new("X-Frame-Options", false, null, 0, max,
            "Prevents your site from being embedded in an iframe on another site (clickjacking protection).", "missing");
    }

    private static SecurityHeaderCheck EvaluateXContentTypeOptions(IDictionary<string, string> h)
    {
        const int max = 10;
        if (h.TryGetValue("x-content-type-options", out var v)
            && v.Contains("nosniff", StringComparison.OrdinalIgnoreCase))
            return new("X-Content-Type-Options", true, v, max, max,
                "Stops browsers from guessing (sniffing) the MIME type of a response — prevents some script-injection tricks.", "good");

        return new("X-Content-Type-Options", false, null, 0, max,
            "Stops browsers from guessing (sniffing) the MIME type of a response — prevents some script-injection tricks.", "missing");
    }

    private static SecurityHeaderCheck EvaluateReferrerPolicy(IDictionary<string, string> h)
    {
        const int max = 10;
        if (h.TryGetValue("referrer-policy", out var v))
            return new("Referrer-Policy", true, v, max, max,
                "Controls how much referrer information is sent when users click links to other sites.", "good");

        return new("Referrer-Policy", false, null, 0, max,
            "Controls how much referrer information is sent when users click links to other sites.", "missing");
    }

    private static SecurityHeaderCheck EvaluatePermissionsPolicy(IDictionary<string, string> h)
    {
        const int max = 10;
        if (h.TryGetValue("permissions-policy", out var v))
            return new("Permissions-Policy", true, v, max, max,
                "Restricts which browser features (camera, microphone, geolocation, …) the page may use.", "good");

        if (h.TryGetValue("feature-policy", out var legacy))
            return new("Permissions-Policy", true, legacy, max / 2, max,
                "Restricts which browser features the page may use. (Legacy header — replace with Permissions-Policy.)", "warning");

        return new("Permissions-Policy", false, null, 0, max,
            "Restricts which browser features (camera, microphone, geolocation, …) the page may use.", "missing");
    }

    private static SecurityHeaderCheck EvaluateHttps(bool https)
    {
        const int max = 20;
        return https
            ? new("HTTPS", true, "https", max, max,
                "Encrypted in transit — required for any modern site.", "good")
            : new("HTTPS", false, "http", 0, max,
                "Site served over plain HTTP. All security headers are largely meaningless without HTTPS.", "missing");
    }

    // ─── helpers ──────────────────────────────────────────────────────────

    private static long ExtractMaxAge(string headerValue)
    {
        // crude max-age=N parser
        var idx = headerValue.IndexOf("max-age=", StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return 0;
        var rest = headerValue[(idx + "max-age=".Length)..];
        var end = rest.IndexOfAny(new[] { ',', ';', ' ' });
        var num = end < 0 ? rest : rest[..end];
        return long.TryParse(num.Trim(), out var n) ? n : 0;
    }

    private static string ToGrade(int score) => score switch
    {
        >= 95 => "A+",
        >= 85 => "A",
        >= 75 => "B",
        >= 65 => "C",
        >= 50 => "D",
        _     => "F",
    };

    private static string BuildSummary(IList<SecurityHeaderCheck> checks, int score, string grade)
    {
        var missing = checks.Count(c => c.Status == "missing");
        var warnings = checks.Count(c => c.Status == "warning");
        if (grade is "A+" or "A")
            return $"Excellent — score {score}/100. The site sends strong security headers.";
        if (grade == "B")
            return $"Good — score {score}/100. A few headers are missing or weakened.";
        if (grade == "C")
            return $"Mediocre — score {score}/100. {missing} important header(s) missing.";
        return $"Poor — score {score}/100. {missing} headers missing, {warnings} weakened.";
    }
}
