using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Persists shareable Full Domain Reports as JSON files on disk and serves them by ID.
/// File-based to avoid adding a database dependency. Includes a TTL: reports older than
/// the retention window are deleted on next access.
/// </summary>
public sealed class ReportStore
{
    private readonly string _dir;
    private readonly TimeSpan _retention;
    private readonly ILogger<ReportStore> _logger;
    private readonly ConcurrentDictionary<string, byte> _knownIds = new();
    private readonly JsonSerializerOptions _json = new() { WriteIndented = false };

    public ReportStore(IConfiguration config, ILogger<ReportStore> logger)
    {
        _logger = logger;
        _dir = config.GetValue<string>("Reports:Directory")
               ?? Path.Combine(AppContext.BaseDirectory, "data", "reports");
        _retention = TimeSpan.FromDays(config.GetValue<int>("Reports:RetentionDays", 30));
        Directory.CreateDirectory(_dir);
        foreach (var f in Directory.EnumerateFiles(_dir, "*.json"))
            _knownIds.TryAdd(Path.GetFileNameWithoutExtension(f), 0);
    }

    public TimeSpan Retention => _retention;

    public async Task<string> SaveAsync(FullReportResponse report)
    {
        var id = NewId();
        var path = Path.Combine(_dir, id + ".json");
        await using var fs = File.Create(path);
        await JsonSerializer.SerializeAsync(fs, report, _json);
        _knownIds.TryAdd(id, 0);
        _logger.LogInformation("Saved shared report {Id} for {Host}", id, report.Host);
        return id;
    }

    public async Task<FullReportResponse?> GetAsync(string id)
    {
        if (!IsValidId(id)) return null;
        var path = Path.Combine(_dir, id + ".json");
        if (!File.Exists(path)) return null;

        var info = new FileInfo(path);
        if (DateTime.UtcNow - info.CreationTimeUtc > _retention)
        {
            try { File.Delete(path); _knownIds.TryRemove(id, out _); } catch { /* ignore */ }
            return null;
        }

        await using var fs = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<FullReportResponse>(fs, _json);
    }

    private static string NewId()
    {
        // 12 bytes → 16-char URL-safe base64; collision-resistant for a small public store.
        Span<byte> bytes = stackalloc byte[12];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static bool IsValidId(string id) =>
        id.Length is > 4 and < 40 && id.All(c => char.IsLetterOrDigit(c) || c is '-' or '_');
}
