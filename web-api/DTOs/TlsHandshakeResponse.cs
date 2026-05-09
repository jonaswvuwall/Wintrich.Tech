namespace Wintrich.NetworkApi.DTOs;

/// <summary>One phase of the TLS connection lifecycle, with elapsed timings.</summary>
public sealed record TlsHandshakePhase(
    string Name,
    string Description,
    long StartMs,
    long DurationMs,
    bool Success,
    string? Detail);

/// <summary>Full TLS handshake timeline response — one connection, broken down phase by phase.</summary>
public sealed record TlsHandshakeResponse(
    string Host,
    int Port,
    string? ResolvedIp,
    string? Protocol,
    string? CipherSuite,
    string? Issuer,
    string? Subject,
    long? CertDaysUntilExpiry,
    long TotalMs,
    DateTime Timestamp,
    IReadOnlyList<TlsHandshakePhase> Phases,
    string? Error);
