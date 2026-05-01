namespace Wintrich.NetworkApi.DTOs;

public record TlsInfoResponse(
    string Host,
    string? Protocol,
    string? CipherSuite,
    string? Issuer,
    string? Subject,
    DateOnly? ValidFrom,
    DateOnly? ValidUntil,
    long? DaysUntilExpiry,
    bool? Expired,
    string? SerialNumber,
    string[]? SubjectAlternativeNames,
    string? Error
);
