namespace Wintrich.NetworkApi.DTOs;

/// <summary>
/// WHOIS lookup result for a domain. Parsed best-effort from the raw response;
/// the full raw text is included for display.
/// </summary>
public sealed record WhoisResponse(
    string Domain,
    string? Registrar,
    string? RegistrarUrl,
    DateOnly? CreatedOn,
    DateOnly? UpdatedOn,
    DateOnly? ExpiresOn,
    long? AgeDays,
    long? DaysUntilExpiry,
    string[]? NameServers,
    string[]? Status,
    string? Server,
    string? Raw,
    string? Error
);
