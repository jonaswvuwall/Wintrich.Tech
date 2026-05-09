using System.Diagnostics;
using System.Net;
using System.Text.Json;
using DnsClient;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Queries a curated set of public DNS resolvers worldwide for the same host
/// and reports which IPs each one returned. Reveals anycast / GeoDNS behaviour.
/// </summary>
public sealed class AnycastAtlasService(
    IMemoryCache cache,
    IHttpClientFactory httpFactory,
    ILogger<AnycastAtlasService> logger)
{
    private static readonly TimeSpan QueryTimeout = TimeSpan.FromSeconds(3);

    /// <summary>Curated public resolvers with hand-picked geographic anchors.</summary>
    /// <remarks>
    /// Locations are *anchor* coordinates — many of these are anycasted themselves,
    /// so the geo is more "where the marketing pin lives" than "where the actual response came from".
    /// They're useful as a *vantage point* on the map.
    /// </remarks>
    private static readonly Resolver[] Resolvers = new[]
    {
        new Resolver("Cloudflare US",  "Cloudflare", "1.1.1.1",        37.7749, -122.4194, "United States",   "US", "San Francisco"),
        new Resolver("Cloudflare 1",   "Cloudflare", "1.0.0.1",        40.7128, -74.0060,  "United States",   "US", "New York"),
        new Resolver("Google US",      "Google",     "8.8.8.8",        37.4220, -122.0840, "United States",   "US", "Mountain View"),
        new Resolver("Google Alt",     "Google",     "8.8.4.4",        33.4484, -112.0740, "United States",   "US", "Phoenix"),
        new Resolver("Quad9",          "Quad9",      "9.9.9.9",        47.3769, 8.5417,    "Switzerland",     "CH", "Zurich"),
        new Resolver("OpenDNS",        "Cisco",      "208.67.222.222", 37.7749, -122.4194, "United States",   "US", "San Francisco"),
        new Resolver("Yandex",         "Yandex",     "77.88.8.8",      55.7558, 37.6173,   "Russia",          "RU", "Moscow"),
        new Resolver("AdGuard",        "AdGuard",    "94.140.14.14",   50.0755, 14.4378,   "Czechia",         "CZ", "Prague"),
        new Resolver("DNS.WATCH",      "DNS.WATCH",  "84.200.69.80",   50.1109, 8.6821,    "Germany",         "DE", "Frankfurt"),
        new Resolver("CleanBrowsing",  "CleanBrowsing","185.228.168.9",51.5074, -0.1278,   "United Kingdom",  "GB", "London"),
        new Resolver("Comodo",         "Comodo",     "8.26.56.26",     40.7589, -73.9851,  "United States",   "US", "New York"),
        new Resolver("Level3",         "CenturyLink","4.2.2.1",        38.9072, -77.0369,  "United States",   "US", "Washington"),
        new Resolver("Neustar",        "Neustar",    "156.154.70.1",   39.0438, -77.4874,  "United States",   "US", "Sterling"),
        new Resolver("Alibaba",        "Alibaba",    "223.5.5.5",      30.2741, 120.1551,  "China",           "CN", "Hangzhou"),
        new Resolver("OpenNIC AU",     "OpenNIC",    "103.236.162.119",-33.8688, 151.2093, "Australia",       "AU", "Sydney"),
        new Resolver("DNS.SB DE",      "DNS.SB",     "185.222.222.222",52.5200, 13.4050,   "Germany",         "DE", "Berlin"),
    };

    public async Task<AnycastAtlasResponse> RunAsync(string host, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();

        var tasks = Resolvers.Select(r => QueryOneAsync(host, r, ct)).ToArray();
        var results = await Task.WhenAll(tasks);

        // Aggregate every distinct IP across all resolvers
        var endpointMap = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var r in results)
        {
            foreach (var ip in r.ResolvedIps)
            {
                endpointMap.TryGetValue(ip, out var c);
                endpointMap[ip] = c + 1;
            }
        }

        var endpoints = await EnrichEndpointsAsync(endpointMap, ct);

        sw.Stop();
        return new AnycastAtlasResponse(
            Host: host,
            Timestamp: DateTime.UtcNow,
            TotalDurationMs: sw.ElapsedMilliseconds,
            UniqueEndpoints: endpoints.Count,
            ResolverCount: results.Count(r => r.Error is null),
            Resolvers: results,
            Endpoints: endpoints,
            Error: results.All(r => r.Error is not null) ? "All resolvers failed" : null);
    }

    private async Task<AnycastResolver> QueryOneAsync(string host, Resolver r, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(QueryTimeout);

            var client = new LookupClient(new LookupClientOptions(IPAddress.Parse(r.Ip))
            {
                Timeout = QueryTimeout,
                UseCache = false,
                Retries = 0,
            });

            var response = await client.QueryAsync(host, QueryType.A, cancellationToken: cts.Token);
            var ips = response.Answers.ARecords()
                .Select(a => a.Address.ToString())
                .Distinct(StringComparer.Ordinal)
                .ToList();

            sw.Stop();
            return new AnycastResolver(
                Name: r.Name,
                Provider: r.Provider,
                Ip: r.Ip,
                Lat: r.Lat,
                Lon: r.Lon,
                Country: r.Country,
                CountryCode: r.CountryCode,
                City: r.City,
                ResolvedIps: ips,
                LatencyMs: sw.ElapsedMilliseconds,
                Error: ips.Count == 0 ? "No A records returned" : null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogDebug(ex, "Resolver {Name} ({Ip}) failed for {Host}", r.Name, r.Ip, host);
            return new AnycastResolver(
                Name: r.Name, Provider: r.Provider, Ip: r.Ip,
                Lat: r.Lat, Lon: r.Lon, Country: r.Country, CountryCode: r.CountryCode, City: r.City,
                ResolvedIps: Array.Empty<string>(),
                LatencyMs: sw.ElapsedMilliseconds,
                Error: ex.GetType().Name);
        }
    }

    private async Task<IReadOnlyList<AnycastEndpoint>> EnrichEndpointsAsync(
        Dictionary<string, int> endpointMap, CancellationToken ct)
    {
        if (endpointMap.Count == 0) return Array.Empty<AnycastEndpoint>();

        var ipsToLookup = endpointMap.Keys
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
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Endpoint geo enrichment failed");
            }
        }

        var result = new List<AnycastEndpoint>(endpointMap.Count);
        foreach (var (ip, count) in endpointMap.OrderByDescending(kv => kv.Value))
        {
            string? asn = null, asnName = null, country = null, cc = null, city = null;
            double? lat = null, lon = null;
            if (cache.TryGetValue<IpApiEntry>(GeoKey(ip), out var geo) && geo is not null && geo.status == "success")
            {
                country = geo.country;
                cc = geo.countryCode;
                city = geo.city;
                lat = geo.lat;
                lon = geo.lon;
                if (!string.IsNullOrEmpty(geo.@as))
                {
                    var space = geo.@as.IndexOf(' ');
                    if (space > 0) { asn = geo.@as[..space]; asnName = geo.@as[(space + 1)..]; }
                    else asn = geo.@as;
                }
            }
            result.Add(new AnycastEndpoint(ip, asn, asnName, country, cc, city, lat, lon, count));
        }

        return result;
    }

    private static string GeoKey(string ip) => "geo:" + ip;

    private sealed record Resolver(
        string Name, string Provider, string Ip,
        double Lat, double Lon, string Country, string CountryCode, string? City);

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
