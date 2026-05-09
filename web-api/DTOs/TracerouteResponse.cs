namespace Wintrich.NetworkApi.DTOs;

/// <summary>One hop along the traceroute path.</summary>
public sealed record TracerouteHop(
    int Hop,
    string? Ip,
    string? Hostname,
    long? LatencyMs,
    bool Reached,
    string? Asn,
    string? AsnName,
    string? Country,
    string? CountryCode,
    string? City,
    double? Lat,
    double? Lon,
    bool IsPrivate);

/// <summary>Full traceroute response: ordered hops from origin to destination.</summary>
public sealed record TracerouteResponse(
    string Host,
    string? DestinationIp,
    bool Completed,
    int HopCount,
    long TotalDurationMs,
    DateTime Timestamp,
    IReadOnlyList<TracerouteHop> Hops,
    string? Error);
