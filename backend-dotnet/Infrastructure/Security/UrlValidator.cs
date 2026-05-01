using System.Net;
using System.Text.RegularExpressions;
using Wintrich.NetworkApi.Infrastructure.Exceptions;

namespace Wintrich.NetworkApi.Infrastructure.Security;

/// <summary>
/// Validates host names and URLs against SSRF attacks — direct port of the Java UrlValidator.
/// </summary>
public sealed class UrlValidator
{
    private readonly bool _blockInternalIps;
    private readonly HashSet<string> _blockedHosts;
    private readonly ILogger<UrlValidator> _logger;

    private static readonly Regex ValidDomainPattern =
        new(@"^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$",
            RegexOptions.Compiled, TimeSpan.FromSeconds(1));

    private static readonly Regex ValidIpPattern =
        new(@"^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$",
            RegexOptions.Compiled, TimeSpan.FromSeconds(1));

    public UrlValidator(IConfiguration configuration, ILogger<UrlValidator> logger)
    {
        _logger = logger;
        _blockInternalIps = configuration.GetValue<bool>("Api:Network:Security:BlockInternalIps", true);
        var blocked = configuration.GetSection("Api:Network:Security:BlockedHosts").Get<string[]>()
                      ?? new[] { "localhost", "127.0.0.1", "0.0.0.0" };
        _blockedHosts = new HashSet<string>(blocked, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>Validates a full URL, checking scheme and delegating host validation.</summary>
    public void ValidateUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new NetworkSecurityException("Invalid URL format");

        var scheme = uri.Scheme;
        if (!string.Equals(scheme, "http", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(scheme, "https", StringComparison.OrdinalIgnoreCase))
            throw new NetworkSecurityException("Only HTTP and HTTPS protocols are allowed");

        var host = uri.Host;
        if (string.IsNullOrWhiteSpace(host))
            throw new NetworkSecurityException("Invalid URL: no host specified");

        ValidateHost(host);
    }

    /// <summary>Validates a bare host or IP address against SSRF rules.</summary>
    public void ValidateHost(string host)
    {
        if (string.IsNullOrWhiteSpace(host))
            throw new NetworkSecurityException("Host cannot be empty");

        host = host.Trim().ToLowerInvariant();

        if (_blockedHosts.Contains(host))
        {
            _logger.LogWarning("Blocked host access attempt: {Host}", host);
            throw new NetworkSecurityException("Access to this host is not allowed");
        }

        if (IsLocalhost(host))
        {
            _logger.LogWarning("Localhost access attempt: {Host}", host);
            throw new NetworkSecurityException("Access to localhost is not allowed");
        }

        if (!IsValidDomain(host) && !IsValidIp(host))
            throw new NetworkSecurityException("Invalid host format");

        if (_blockInternalIps)
        {
            try
            {
                var addresses = Dns.GetHostAddresses(host);
                foreach (var address in addresses)
                {
                    if (IsInternalIp(address))
                    {
                        _logger.LogWarning("Internal IP access attempt: {Host} -> {Ip}", host, address);
                        throw new NetworkSecurityException("Access to internal IPs is not allowed");
                    }
                }
            }
            catch (NetworkSecurityException)
            {
                throw;
            }
            catch
            {
                // Cannot resolve — let the actual service handle it
                _logger.LogDebug("Could not resolve host for IP check: {Host}", host);
            }
        }
    }

    private static bool IsLocalhost(string host) =>
        host is "localhost" or "127.0.0.1" or "0.0.0.0" or "::1" or "[::1]"
        || host.StartsWith("127.", StringComparison.Ordinal);

    private static bool IsInternalIp(IPAddress address) =>
        IPAddress.IsLoopback(address)
        || address.IsIPv6LinkLocal
        || address.IsIPv6SiteLocal
        || IsPrivateRange(address);

    private static bool IsPrivateRange(IPAddress address)
    {
        var ip = address.ToString();

        // 10.0.0.0/8
        if (ip.StartsWith("10.", StringComparison.Ordinal)) return true;

        // 172.16.0.0/12
        if (ip.StartsWith("172.", StringComparison.Ordinal))
        {
            var parts = ip.Split('.');
            if (parts.Length >= 2 && int.TryParse(parts[1], out var second) && second >= 16 && second <= 31)
                return true;
        }

        // 192.168.0.0/16
        if (ip.StartsWith("192.168.", StringComparison.Ordinal)) return true;

        // 169.254.0.0/16 (link-local)
        if (ip.StartsWith("169.254.", StringComparison.Ordinal)) return true;

        return false;
    }

    private static bool IsValidDomain(string domain) => ValidDomainPattern.IsMatch(domain);
    private static bool IsValidIp(string ip) => ValidIpPattern.IsMatch(ip);
}
