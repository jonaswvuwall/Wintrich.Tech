namespace Wintrich.NetworkApi.DTOs;

/// <summary>One public DNS resolver's view of the host.</summary>
public sealed record AnycastResolver(
    string Name,
    string Provider,
    string Ip,
    double Lat,
    double Lon,
    string Country,
    string CountryCode,
    string? City,
    IReadOnlyList<string> ResolvedIps,
    long? LatencyMs,
    string? Error);

/// <summary>One destination IP that one or more resolvers returned.</summary>
public sealed record AnycastEndpoint(
    string Ip,
    string? Asn,
    string? AsnName,
    string? Country,
    string? CountryCode,
    string? City,
    double? Lat,
    double? Lon,
    int ResolverCount);

/// <summary>Full anycast-atlas response.</summary>
public sealed record AnycastAtlasResponse(
    string Host,
    DateTime Timestamp,
    long TotalDurationMs,
    int UniqueEndpoints,
    int ResolverCount,
    IReadOnlyList<AnycastResolver> Resolvers,
    IReadOnlyList<AnycastEndpoint> Endpoints,
    string? Error);
