namespace Wintrich.NetworkApi.DTOs;

public record PingResponse(
    string Host,
    string? Ip,
    bool Reachable,
    long? LatencyMs,
    DateTime Timestamp,
    string? Error
);
