namespace Wintrich.NetworkApi.DTOs;

/// <summary>
/// Result of an email-authentication audit (SPF, DKIM, DMARC) for a domain.
/// Each individual check carries its own status so the UI can render per-record findings.
/// </summary>
public sealed record EmailAuthResponse(
    string Domain,
    EmailAuthCheck Spf,
    EmailAuthCheck Dmarc,
    EmailAuthCheck Dkim,
    int Score,
    int MaxScore,
    string Grade,
    string Summary,
    string? Error
);

/// <summary>One row of the email-auth audit (e.g. SPF, DMARC, DKIM).</summary>
/// <param name="Status">"good", "warning", "missing" or "error".</param>
public sealed record EmailAuthCheck(
    string Name,
    bool Present,
    string? Record,
    string Status,
    string Description,
    string[]? Findings
);
