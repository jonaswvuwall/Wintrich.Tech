using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// ICMP traceroute that walks the path to a host one TTL at a time, then enriches
/// each public hop with geo / ASN information via ip-api.com (batched, cached).
/// </summary>
public sealed class TracerouteService(
    IMemoryCache cache,
    IHttpClientFactory httpFactory,
    ILogger<TracerouteService> logger)
{
    private const int MaxHops = 25;
    private const int ProbeTimeoutMs = 1500;
    private const int MaxConsecutiveTimeouts = 4;
    private static readonly byte[] ProbePayload = "Wintrich.Tech traceroute"u8.ToArray();

    public async Task<TracerouteResponse> RunAsync(string host, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        IPAddress? destination = null;
        try
        {
            var addrs = await Dns.GetHostAddressesAsync(host, ct);
            destination = Array.Find(addrs, a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
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
                var reply = await ping.SendPingAsync(destination, ProbeTimeoutMs, ProbePayload, options);
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
                else
                {
                    logger.LogDebug("Traceroute hop {Ttl} status: {Status}", ttl, reply.Status);
                }
            }
            catch (PingException ex)
            {
                logger.LogDebug(ex, "Ping exception at hop {Ttl}", ttl);
            }

            if (hopIp is null || hopIp.Equals(IPAddress.Any))
            {
                hops.Add(new TracerouteHop(ttl, null, null, null, false, null, null, null, null, null, null, null, false));
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

    private async Task EnrichAsync(List<TracerouteHop> hops, CancellationToken ct)
    {
        // Reverse-DNS in parallel for every public hop
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

        // Geo / ASN lookup — batched via ip-api.com
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
                var body = JsonSerializer.Serialize(ipsToLookup.Select(ip => new { query = ip, fields = "status,country,countryCode,city,lat,lon,as,query" }));
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
            || bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127; // CGNAT
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
