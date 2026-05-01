using System.Net;
using System.Net.NetworkInformation;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Connectivity and latency checks using System.Net.NetworkInformation.Ping.
/// Equivalent of the Java ConnectivityService (system ping + DNS resolution).
/// </summary>
public sealed class ConnectivityService(IConfiguration configuration, ILogger<ConnectivityService> logger)
{
    private readonly int _pingTimeout = configuration.GetValue<int>("Api:Network:Timeout:Ping", 3000);

    public async Task<PingResponse> PingAsync(string host)
    {
        logger.LogDebug("Performing ping check for host: {Host}", host);

        string? ip = null;
        bool reachable = false;
        long? latencyMs = null;
        string? error = null;

        try
        {
            // Resolve IP address first (mirrors Java's InetAddress.getByName)
            var addresses = await Dns.GetHostAddressesAsync(host);
            ip = addresses.FirstOrDefault()?.ToString();

            // Use the .NET Ping class (maps directly to system ICMP ping)
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(host, _pingTimeout);

            reachable = reply.Status == IPStatus.Success;
            latencyMs = reachable ? reply.RoundtripTime : null;

            if (!reachable)
                error = $"Host unreachable (status: {reply.Status})";
        }
        catch (PingException ex)
        {
            logger.LogError(ex, "Ping failed for host: {Host}", host);
            reachable = false;
            error = $"Ping failed: {ex.InnerException?.Message ?? ex.Message}";
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Connectivity check failed for host: {Host}", host);
            reachable = false;
            error = $"Connection error: {ex.Message}";
        }

        return new PingResponse(host, ip, reachable, latencyMs, DateTime.UtcNow, error);
    }
}
