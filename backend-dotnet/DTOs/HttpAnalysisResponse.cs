namespace Wintrich.NetworkApi.DTOs;

public record HttpAnalysisResponse(
    string Url,
    int? Status,
    string? StatusText,
    long? ResponseTimeMs,
    string? ContentType,
    string? Server,
    Dictionary<string, string>? Headers,
    string[]? RedirectChain,
    string? FinalUrl,
    long? ContentLength,
    string? Error
);
