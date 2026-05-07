namespace Wintrich.NetworkApi.DTOs;

/// <summary>Request body for creating a new monitor.</summary>
public sealed record CreateMonitorRequest(
    string Host,
    string? Email,
    int? CertWarnDays,
    bool? CheckHttp,
    bool? CheckTls
);

/// <summary>A persisted monitor — checked periodically by the background service.</summary>
public sealed record MonitorEntry(
    string Id,
    string Host,
    string? Email,
    int CertWarnDays,
    bool CheckHttp,
    bool CheckTls,
    DateTime CreatedAt,
    DateTime? LastCheckedAt,
    string? LastStatus,
    string? LastError,
    long? LastDaysUntilExpiry,
    int? LastHttpStatus,
    DateTime? LastAlertAt,
    string? LastAlertReason
);
