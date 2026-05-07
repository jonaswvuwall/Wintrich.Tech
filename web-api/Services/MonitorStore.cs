using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// File-backed store for monitors. The whole collection is loaded on start-up and kept in
/// memory; mutations are serialised back to disk under a lock. Suitable for the small
/// number of monitors expected per single-tenant deployment.
/// </summary>
public sealed class MonitorStore
{
    private readonly string _path;
    private readonly ConcurrentDictionary<string, MonitorEntry> _monitors = new(StringComparer.OrdinalIgnoreCase);
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly JsonSerializerOptions _json = new() { WriteIndented = true };
    private readonly ILogger<MonitorStore> _logger;

    public MonitorStore(IConfiguration config, ILogger<MonitorStore> logger)
    {
        _logger = logger;
        var dir = config.GetValue<string>("Monitors:Directory")
                  ?? Path.Combine(AppContext.BaseDirectory, "data", "monitors");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "monitors.json");

        if (File.Exists(_path))
        {
            try
            {
                var loaded = JsonSerializer.Deserialize<List<MonitorEntry>>(File.ReadAllText(_path), _json) ?? new();
                foreach (var m in loaded) _monitors[m.Id] = m;
                _logger.LogInformation("Loaded {Count} monitor(s) from {Path}", _monitors.Count, _path);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not load monitors from {Path}", _path);
            }
        }
    }

    public IReadOnlyCollection<MonitorEntry> All() => _monitors.Values.ToArray();

    public MonitorEntry? Get(string id) => _monitors.TryGetValue(id, out var m) ? m : null;

    public async Task<MonitorEntry> AddAsync(CreateMonitorRequest req)
    {
        var monitor = new MonitorEntry(
            Id: NewId(),
            Host: req.Host.Trim().ToLowerInvariant(),
            Email: string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
            CertWarnDays: req.CertWarnDays is > 0 ? req.CertWarnDays.Value : 30,
            CheckHttp: req.CheckHttp ?? true,
            CheckTls: req.CheckTls ?? true,
            CreatedAt: DateTime.UtcNow,
            LastCheckedAt: null, LastStatus: null, LastError: null,
            LastDaysUntilExpiry: null, LastHttpStatus: null,
            LastAlertAt: null, LastAlertReason: null);

        _monitors[monitor.Id] = monitor;
        await PersistAsync();
        return monitor;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        if (!_monitors.TryRemove(id, out _)) return false;
        await PersistAsync();
        return true;
    }

    public async Task UpdateAsync(MonitorEntry updated)
    {
        _monitors[updated.Id] = updated;
        await PersistAsync();
    }

    private async Task PersistAsync()
    {
        await _writeLock.WaitAsync();
        try
        {
            var snapshot = _monitors.Values.ToArray();
            await File.WriteAllTextAsync(_path, JsonSerializer.Serialize(snapshot, _json));
        }
        finally { _writeLock.Release(); }
    }

    private static string NewId()
    {
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }
}
