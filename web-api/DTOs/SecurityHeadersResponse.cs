namespace Wintrich.NetworkApi.DTOs;

public record SecurityHeaderCheck(
    string Name,
    bool Present,
    string? Value,
    int Score,
    int MaxScore,
    string Description,
    string Status // "good" | "warning" | "missing"
);

public record SecurityHeadersResponse(
    string Url,
    int? StatusCode,
    bool UsesHttps,
    int Score,
    int MaxScore,
    string Grade,        // "A+" | "A" | "B" | "C" | "D" | "F"
    string Summary,
    SecurityHeaderCheck[] Checks,
    string? Error
);
