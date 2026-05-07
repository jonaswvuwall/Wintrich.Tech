namespace Wintrich.NetworkApi.DTOs;

/// <summary>
/// Aggregated "Full Domain Report" combining every available probe plus a single overall
/// grade and a list of human-readable findings. This is what gets stored when a user
/// requests a shareable permalink.
/// </summary>
public sealed record FullReportResponse(
    string Host,
    DateTime GeneratedAt,
    int Score,
    int MaxScore,
    string Grade,
    string Summary,
    ReportFinding[] Findings,
    PingResponse? Ping,
    DnsResponse? Dns,
    TlsInfoResponse? Tls,
    HttpAnalysisResponse? Http,
    SecurityHeadersResponse? SecurityHeaders,
    EmailAuthResponse? EmailAuth,
    WhoisResponse? Whois
);

/// <param name="Severity">"info", "warning" or "critical".</param>
public sealed record ReportFinding(string Severity, string Category, string Message);

/// <summary>Returned when a report is shared, giving the caller the permalink slug.</summary>
public sealed record SharedReportResponse(string Id, string Url, DateTime ExpiresAt);
