using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Walks the network path to a host and enriches every public hop with reverse-DNS
/// plus geo / ASN information from ip-api.com (batched + 24 h memory-cached).
/// </summary>
/// <remarks>
/// Linux/macOS: shells out to the system <c>traceroute</c> binary (UDP probes,
/// no elevated privileges required).  Windows: uses <see cref="Ping"/> with
/// incrementing TTL — works without elevation thanks to Windows' IcmpSendEcho2 API.
/// </remarks>
public sealed class TracerouteService(
    IMemoryCache cache,
    IHttpClientFactory httpFactory,
    ILogger<TracerouteService> logger)
{
    private const int MaxHops = 25;
    private const int ProbeTimeoutSec = 2;
    private const int MaxConsecutiveTimeouts = 4;
    private static readonly byte[] ProbePayload = "Wintrich.Tech traceroute"u8.ToArray();

    public async Task<TracerouteResponse> RunAsync(string host, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        IPAddress? destination = null;
        try
        {
            var addrs = await Dns.GetHostAddressesAsync(host, ct);
            destination = Array.Find(addrs, a => a.AddressFamily == AddressFamily.InterNetwork)
                          ?? addrs.FirstOrDefault();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Traceroute DNS resolution failed for {Host}", host);
            return new TracerouteResponse(host, null, false, 0, sw.ElapsedMilliseconds,
                DateTime.UtcNow, Array.Empty<TracerouteHop>(), $"Could not resolve host: {ex.Message}");
        }

        if (destination is null)
        {
            return new TracerouteResponse(host, null, false, 0, sw.ElapsedMilliseconds,
                DateTime.UtcNow, Array.Empty<TracerouteHop>(), "No IP address resolved");
        }

        List<TracerouteHop> hops;
        bool reached;

        try
        {
            (hops, reached) = OperatingSystem.IsWindows()
                ? await RunWithDotNetPingAsync(destination, ct)
                : await RunWithSystemBinaryAsync(host, destination, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Traceroute failed for {Host}", host);
            return new TracerouteResponse(host, destination.ToString(), false, 0, sw.ElapsedMilliseconds,
                DateTime.UtcNow, Array.Empty<TracerouteHop>(), $"Traceroute failed: {ex.Message}");
        }

        await EnrichAsync(hops, ct);

        sw.Stop();
        return new TracerouteResponse(
            Host: host,
            DestinationIp: destination.ToString(),
            Completed: reached,
            HopCount: hops.Count,
            TotalDurationMs: sw.ElapsedMilliseconds,
            Timestamp: DateTime.UtcNow,
            Hops: hops,
            Error: reached ? null : $"Destination not reached within {hops.Count} hops");
    }

    /* ─────────────────────────────────────────────────────────────────
       Linux / macOS: system traceroute binary
       ───────────────────────────────────────────────────────────────── */

    // "  3  93.184.216.34  12.345 ms"  or  "  4  *"
    private static readonly Regex HopLineRegex = new(
        @"^\s*(?<n>\d+)\s+(?<rest>.+)$",
        RegexOptions.Compiled);

    private static readonly Regex IpRegex = new(
        @"\b(?<ip>(\d{1,3}\.){3}\d{1,3})\b",
        RegexOptions.Compiled);

    private static readonly Regex MsRegex = new(
        @"(?<ms>\d+(?:\.\d+)?)\s*ms",
        RegexOptions.Compiled);

    private async Task<(List<TracerouteHop> hops, bool reached)> RunWithSystemBinaryAsync(
        string host, IPAddress destination, CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "traceroute",
            // -n : no rDNS (we do it ourselves, in parallel)
            // -w : per-probe timeout (seconds)
            // -q : one probe per hop (faster)
            // -m : max hops
            ArgumentList = { "-n", "-w", ProbeTimeoutSec.ToString(), "-q", "1", "-m", MaxHops.ToString(), host },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var proc = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start traceroute process");

        // Hard wall-clock cap so a flaky network can't tie up the request indefinitely.
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds((ProbeTimeoutSec + 1) * MaxHops));

        var hops = new List<TracerouteHop>();
        bool reached = false;
        int consecutiveTimeouts = 0;
        var destString = destination.ToString();

        try
        {
            string? line;
            while ((line = await proc.StandardOutput.ReadLineAsync(timeoutCts.Token)) is not null)
            {
                var hop = ParseTracerouteLine(line);
                if (hop is null) continue;

                hops.Add(hop);

                if (hop.Ip is not null && hop.Ip == destString)
                {
                    reached = true;
                    break;
                }

                if (hop.Ip is null)
                {
                    consecutiveTimeouts++;
                    if (consecutiveTimeouts >= MaxConsecutiveTimeouts) break;
                }
                else consecutiveTimeouts = 0;
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("traceroute timed out for {Host}", host);
        }

        try { if (!proc.HasExited) proc.Kill(entireProcessTree: true); } catch { /* ignored */ }

        return (hops, reached);
    }

    private static TracerouteHop? ParseTracerouteLine(string line)
    {
        var m = HopLineRegex.Match(line);
        if (!m.Success) return null;
        if (!int.TryParse(m.Groups["n"].Value, out var hopNum)) return null;

        var rest = m.Groups["rest"].Value;
        var ipMatch = IpRegex.Match(rest);
        var msMatch = MsRegex.Match(rest);

        if (!ipMatch.Success)
        {
            // "* * *" — hop didn't respond
            return new TracerouteHop(hopNum, null, null, null, false,
                null, null, null, null, null, null, null, false);
        }

        if (!IPAddress.TryParse(ipMatch.Groups["ip"].Value, out var ip))
            return null;

        long? latency = null;
        if (msMatch.Success && double.TryParse(msMatch.Groups["ms"].Value,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var ms))
        {
            latency = (long)Math.Round(ms);
        }

        return new TracerouteHop(
            Hop: hopNum,
            Ip: ip.ToString(),
            Hostname: null,
            LatencyMs: latency,
            Reached: false,
            Asn: null, AsnName: null, Country: null, CountryCode: null, City: null,
            Lat: null, Lon: null,
            IsPrivate: IsPrivate(ip));
    }

    /* ─────────────────────────────────────────────────────────────────
       Windows: .NET Ping with incrementing TTL (works unprivileged)
       ───────────────────────────────────────────────────────────────── */

    private async Task<(List<TracerouteHop> hops, bool reached)> RunWithDotNetPingAsync(
        IPAddress destination, CancellationToken ct)
    {
        var hops = new List<TracerouteHop>();
        bool reached = false;
        int consecutiveTimeouts = 0;

        using var ping = new Ping();
        for (int ttl = 1; ttl <= MaxHops; ttl++)
        {
            ct.ThrowIfCancellationRequested();
            var options = new PingOptions(ttl, dontFragment: true);
            long? latency = null;
            IPAddress? hopIp = null;
            bool hopReached = false;

            try
            {
                var reply = await ping.SendPingAsync(destination, ProbeTimeoutSec * 1000, ProbePayload, options);
                hopIp = reply.Address;
                if (reply.Status == IPStatus.Success)
                {
                    latency = reply.RoundtripTime;
                    hopReached = true;
                    reached = true;
                }
                else if (reply.Status == IPStatus.TtlExpired)
                {
                    latency = reply.RoundtripTime;
                }
                else if (reply.Status == IPStatus.TimedOut)
                {
                    hopIp = null;
                }
            }
            catch (PingException ex)
            {
                logger.LogDebug(ex, "Ping exception at hop {Ttl}", ttl);
            }

            if (hopIp is null || hopIp.Equals(IPAddress.Any))
            {
                hops.Add(new TracerouteHop(ttl, null, null, null, false,
                    null, null, null, null, null, null, null, false));
                consecutiveTimeouts++;
                if (consecutiveTimeouts >= MaxConsecutiveTimeouts) break;
            }
            else
            {
                consecutiveTimeouts = 0;
                hops.Add(new TracerouteHop(ttl, hopIp.ToString(), null, latency, hopReached,
                    null, null, null, null, null, null, null, IsPrivate(hopIp)));
                if (hopReached) break;
            }
        }

        return (hops, reached);
    }

    /* ─────────────────────────────────────────────────────────────────
       Reverse-DNS + geo / ASN enrichment (shared)
       ───────────────────────────────────────────────────────────────── */

    private async Task EnrichAsync(List<TracerouteHop> hops, CancellationToken ct)
    {
        var rdnsTasks = hops
            .Select((h, idx) => (h, idx))
            .Where(t => !string.IsNullOrEmpty(t.h.Ip) && !t.h.IsPrivate)
            .Select(async t =>
            {
                try
                {
                    var entry = await Dns.GetHostEntryAsync(t.h.Ip!, ct);
                    return (t.idx, name: string.IsNullOrEmpty(entry.HostName) ? null : entry.HostName);
                }
                catch
                {
                    return (t.idx, name: (string?)null);
                }
            })
            .ToList();

        var ipsToLookup = hops
            .Where(h => !string.IsNullOrEmpty(h.Ip) && !h.IsPrivate)
            .Select(h => h.Ip!)
            .Distinct()
            .Where(ip => !cache.TryGetValue(GeoKey(ip), out _))
            .ToList();

        if (ipsToLookup.Count > 0)
        {
            try
            {
                var client = httpFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var body = JsonSerializer.Serialize(ipsToLookup.Select(ip => new
                {
                    query = ip,
                    fields = "status,country,countryCode,city,lat,lon,as,query"
                }));
                using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
                using var resp = await client.PostAsync("http://ip-api.com/batch", content, ct);
                if (resp.IsSuccessStatusCode)
                {
                    await using var stream = await resp.Content.ReadAsStreamAsync(ct);
                    var entries = await JsonSerializer.DeserializeAsync<List<IpApiEntry>>(stream, cancellationToken: ct) ?? new();
                    foreach (var e in entries)
                    {
                        if (string.IsNullOrEmpty(e.query)) continue;
                        cache.Set(GeoKey(e.query), e, TimeSpan.FromHours(24));
                    }
                }
                else
                {
                    logger.LogDebug("ip-api batch returned {Status}", resp.StatusCode);
                }
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Geo enrichment failed (continuing without it)");
            }
        }

        var rdnsResults = await Task.WhenAll(rdnsTasks);
        var rdnsMap = rdnsResults.ToDictionary(r => r.idx, r => r.name);

        for (int i = 0; i < hops.Count; i++)
        {
            var h = hops[i];
            if (string.IsNullOrEmpty(h.Ip)) continue;

            string? hostname = rdnsMap.TryGetValue(i, out var n) ? n : null;
            string? asn = null, asnName = null, country = null, cc = null, city = null;
            double? lat = null, lon = null;

            if (!h.IsPrivate && cache.TryGetValue<IpApiEntry>(GeoKey(h.Ip!), out var geo) && geo is not null && geo.status == "success")
            {
                country = geo.country;
                cc = geo.countryCode;
                city = geo.city;
                lat = geo.lat;
                lon = geo.lon;
                if (!string.IsNullOrEmpty(geo.@as))
                {
                    var space = geo.@as.IndexOf(' ');
                    if (space > 0)
                    {
                        asn = geo.@as[..space];
                        asnName = geo.@as[(space + 1)..];
                    }
                    else asn = geo.@as;
                }
            }

            hops[i] = h with
            {
                Hostname = hostname,
                Asn = asn,
                AsnName = asnName,
                Country = country,
                CountryCode = cc,
                City = city,
                Lat = lat,
                Lon = lon
            };
        }
    }

    private static string GeoKey(string ip) => "geo:" + ip;

    private static bool IsPrivate(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;
        var bytes = ip.GetAddressBytes();
        if (bytes.Length != 4) return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal;
        return bytes[0] == 10
            || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
            || (bytes[0] == 192 && bytes[1] == 168)
            || (bytes[0] == 169 && bytes[1] == 254)
            || (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127); // CGNAT
    }

    private sealed class IpApiEntry
    {
        public string? status { get; set; }
        public string? country { get; set; }
        public string? countryCode { get; set; }
        public string? city { get; set; }
        public double? lat { get; set; }
        public double? lon { get; set; }
        public string? @as { get; set; }
        public string? query { get; set; }
    }
}
