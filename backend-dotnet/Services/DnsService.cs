using DnsClient;
using DnsClient.Protocol;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// DNS lookup service using the DnsClient library.
/// Equivalent of the Java DnsService (uses dnsjava under the hood).
/// Results are cached in IMemoryCache, mirroring @Cacheable(value = "dns").
/// </summary>
public sealed class DnsService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<DnsService> _logger;
    private readonly int _cacheTtl;
    private readonly LookupClient _dns;

    public DnsService(IMemoryCache cache, IConfiguration configuration, ILogger<DnsService> logger)
    {
        _cache = cache;
        _logger = logger;
        _cacheTtl = configuration.GetValue<int>("Api:Network:Cache:DnsTtl", 300);

        var timeout = configuration.GetValue<int>("Api:Network:Timeout:Dns", 5000);
        _dns = new LookupClient(new LookupClientOptions
        {
            Timeout = TimeSpan.FromMilliseconds(timeout),
            UseCache = false // We manage our own cache
        });
    }

    public async Task<DnsResponse> LookupAsync(string domain)
    {
        var cacheKey = $"dns:{domain.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out DnsResponse? cached))
            return cached!;

        var result = await PerformLookupAsync(domain);
        _cache.Set(cacheKey, result, TimeSpan.FromSeconds(_cacheTtl));
        return result;
    }

    private async Task<DnsResponse> PerformLookupAsync(string domain)
    {
        _logger.LogDebug("Performing DNS lookup for domain: {Domain}", domain);

        var aRecords = new List<string>();
        var aaaaRecords = new List<string>();
        var mxRecords = new List<string>();
        var nsRecords = new List<string>();
        var txtRecords = new List<string>();
        long? ttl = null;
        string? error = null;

        try
        {
            // A records (IPv4)
            try
            {
                var r = await _dns.QueryAsync(domain, QueryType.A);
                foreach (var rec in r.Answers.ARecords())
                {
                    aRecords.Add(rec.Address.ToString());
                    ttl ??= rec.TimeToLive;
                }
            }
            catch (Exception ex) { _logger.LogWarning("A record lookup failed for {Domain}: {Msg}", domain, ex.Message); }

            // AAAA records (IPv6)
            try
            {
                var r = await _dns.QueryAsync(domain, QueryType.AAAA);
                foreach (var rec in r.Answers.AaaaRecords())
                    aaaaRecords.Add(rec.Address.ToString());
            }
            catch (Exception ex) { _logger.LogWarning("AAAA record lookup failed for {Domain}: {Msg}", domain, ex.Message); }

            // MX records (mail exchange) — includes priority
            try
            {
                var r = await _dns.QueryAsync(domain, QueryType.MX);
                foreach (var rec in r.Answers.MxRecords())
                    mxRecords.Add($"{rec.Preference} {rec.Exchange}");
            }
            catch (Exception ex) { _logger.LogWarning("MX record lookup failed for {Domain}: {Msg}", domain, ex.Message); }

            // NS records (nameservers)
            try
            {
                var r = await _dns.QueryAsync(domain, QueryType.NS);
                foreach (var rec in r.Answers.NsRecords())
                    nsRecords.Add(rec.NSDName.Value);
            }
            catch (Exception ex) { _logger.LogWarning("NS record lookup failed for {Domain}: {Msg}", domain, ex.Message); }

            // TXT records
            try
            {
                var r = await _dns.QueryAsync(domain, QueryType.TXT);
                foreach (var rec in r.Answers.TxtRecords())
                    txtRecords.Add(string.Join(" ", rec.Text));
            }
            catch (Exception ex) { _logger.LogWarning("TXT record lookup failed for {Domain}: {Msg}", domain, ex.Message); }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DNS lookup failed for domain: {Domain}", domain);
            error = $"DNS lookup failed: {ex.Message}";
        }

        return new DnsResponse(domain, aRecords, aaaaRecords, mxRecords, nsRecords, txtRecords, ttl, error);
    }
}
