using System.Globalization;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Minimal WHOIS client that queries IANA for the authoritative server, then queries that
/// server for the actual record. Parses common fields best-effort and returns the raw text.
/// </summary>
public sealed class WhoisService(IMemoryCache cache, ILogger<WhoisService> logger)
{
    private const int Port = 43;
    private const string IanaServer = "whois.iana.org";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan SocketTimeout = TimeSpan.FromSeconds(8);

    public async Task<WhoisResponse> LookupAsync(string domain)
    {
        domain = domain.Trim().ToLowerInvariant();
        var key = $"whois:{domain}";
        if (cache.TryGetValue(key, out WhoisResponse? cached)) return cached!;

        try
        {
            // 1. Ask IANA which server is authoritative for the TLD.
            var ianaResponse = await QueryAsync(IanaServer, domain);
            var refer = ExtractFirst(ianaResponse, @"refer:\s*(\S+)");
            var server = refer ?? IanaServer;

            // 2. Query the authoritative server.
            var raw = server == IanaServer
                ? ianaResponse
                : await QueryAsync(server, domain);

            var result = Parse(domain, server, raw);
            cache.Set(key, result, CacheTtl);
            return result;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "WHOIS lookup failed for {Domain}", domain);
            return new WhoisResponse(domain, null, null, null, null, null, null, null,
                null, null, null, null, $"WHOIS lookup failed: {ex.Message}");
        }
    }

    // ─── network ────────────────────────────────────────────────────────────

    private static async Task<string> QueryAsync(string server, string domain)
    {
        using var cts = new CancellationTokenSource(SocketTimeout);
        using var tcp = new TcpClient();
        await tcp.ConnectAsync(server, Port, cts.Token);

        await using var stream = tcp.GetStream();
        var query = Encoding.ASCII.GetBytes(domain + "\r\n");
        await stream.WriteAsync(query, cts.Token);

        using var ms = new MemoryStream();
        var buffer = new byte[4096];
        int read;
        while ((read = await stream.ReadAsync(buffer, cts.Token)) > 0)
            ms.Write(buffer, 0, read);

        return Encoding.UTF8.GetString(ms.ToArray());
    }

    // ─── parsing ────────────────────────────────────────────────────────────

    private static WhoisResponse Parse(string domain, string server, string raw)
    {
        var registrar    = ExtractFirst(raw, @"Registrar:\s*(.+)")
                        ?? ExtractFirst(raw, @"Sponsoring Registrar:\s*(.+)");
        var registrarUrl = ExtractFirst(raw, @"Registrar URL:\s*(\S+)");

        var created  = ExtractDate(raw, @"(?:Creation Date|Created On|Created|Registered on|created):\s*(\S+)");
        var updated  = ExtractDate(raw, @"(?:Updated Date|Last Modified|Last updated|Changed):\s*(\S+)");
        var expires  = ExtractDate(raw, @"(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|Expiry date|Expires on|paid-till):\s*(\S+)");

        var nameServers = Regex.Matches(raw, @"(?:Name Server|nserver|nameserver):\s*(\S+)", RegexOptions.IgnoreCase)
            .Select(m => m.Groups[1].Value.ToLowerInvariant())
            .Distinct()
            .ToArray();

        var status = Regex.Matches(raw, @"(?:Domain Status|status):\s*([^\r\n]+)", RegexOptions.IgnoreCase)
            .Select(m => m.Groups[1].Value.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .Take(10)
            .ToArray();

        long? ageDays = created.HasValue
            ? (long)(DateTime.UtcNow - created.Value.ToDateTime(TimeOnly.MinValue)).TotalDays
            : null;

        long? daysUntilExpiry = expires.HasValue
            ? (long)(expires.Value.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow).TotalDays
            : null;

        // Trim raw to a sane size for transport
        var trimmedRaw = raw.Length > 8_000 ? raw[..8_000] + "\n…(truncated)" : raw;

        return new WhoisResponse(
            domain, registrar?.Trim(), registrarUrl,
            created, updated, expires,
            ageDays, daysUntilExpiry,
            nameServers.Length == 0 ? null : nameServers,
            status.Length == 0 ? null : status,
            server, trimmedRaw, null);
    }

    private static string? ExtractFirst(string input, string pattern)
    {
        var m = Regex.Match(input, pattern, RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static DateOnly? ExtractDate(string input, string pattern)
    {
        var raw = ExtractFirst(input, pattern);
        if (raw == null) return null;

        // Strip surrounding punctuation; common formats include 1997-09-15T04:00:00Z, 2025-12-31, 31.12.2025
        raw = raw.Trim().TrimEnd('.', ',', ';');

        string[] formats =
        [
            "yyyy-MM-ddTHH:mm:ssZ", "yyyy-MM-ddTHH:mm:ss.fffZ", "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd", "yyyy.MM.dd", "yyyy/MM/dd",
            "dd-MMM-yyyy", "dd.MM.yyyy", "dd/MM/yyyy"
        ];

        if (DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var exact))
            return DateOnly.FromDateTime(exact);

        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var loose))
            return DateOnly.FromDateTime(loose);

        return null;
    }
}
