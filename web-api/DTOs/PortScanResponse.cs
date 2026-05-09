namespace Wintrich.NetworkApi.DTOs;

/// <summary>One scanned port and what we found there.</summary>
public sealed record PortScanResult(
    int Port,
    string Service,         // best-guess service name (e.g. "https", "ssh")
    string Category,        // group bucket: "well-known" | "registered" | "dynamic"
    bool Open,
    long? ResponseMs,
    string? Banner,         // first ~120 bytes of any TCP banner the service emitted
    string? Error);

/// <summary>Full port-scan response \u2014 only includes open ports unless you opt in to all.</summary>
public sealed record PortScanResponse(
    string Host,
    string? ResolvedIp,
    int PortsScanned,
    int OpenCount,
    long TotalDurationMs,
    DateTime Timestamp,
    IReadOnlyList<PortScanResult> Results,
    string? Error);
