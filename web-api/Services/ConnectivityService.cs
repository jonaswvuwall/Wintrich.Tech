using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Connectivity and latency checks using TCP connect probes.
/// (ICMP ping requires elevated privileges that aren't available in
/// most container runtimes such as Render / Heroku.)
/// </summary>
public sealed class ConnectivityService(IConfiguration configuration, ILogger<ConnectivityService> logger)
{
    private static readonly int[] ProbePorts = [443, 80];
    private readonly int _pingTimeout = configuration.GetValue<int>("Api:Network:Timeout:Ping", 3000);

    public async Task<PingResponse> PingAsync(string host)
    {
        logger.LogDebug("Performing TCP connectivity check for host: {Host}", host);

        string? ip = null;
        bool reachable = false;
        long? latencyMs = null;
        string? error = null;

        try
        {
            var addresses = await Dns.GetHostAddressesAsync(host);
            var address = addresses.FirstOrDefault();
            ip = address?.ToString();

            if (address is null)
            {
                error = "Could not resolve host";
            }
            else
            {
                foreach (var port in ProbePorts)
                {
                    var (ok, ms) = await TryTcpConnectAsync(address, port, _pingTimeout);
                    if (ok)
                    {
                        reachable = true;
                        latencyMs = ms;
                        break;
                    }
                }

                if (!reachable)
                    error = $"Host unreachable on TCP ports {string.Join(", ", ProbePorts)}";
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Connectivity check failed for host: {Host}", host);
            reachable = false;
            error = $"Connection error: {ex.Message}";
        }

        return new PingResponse(host, ip, reachable, latencyMs, DateTime.UtcNow, error);
    }

    private static async Task<(bool ok, long ms)> TryTcpConnectAsync(IPAddress address, int port, int timeoutMs)
    {
        using var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
        using var cts = new CancellationTokenSource(timeoutMs);
        var sw = Stopwatch.StartNew();
        try
        {
            await socket.ConnectAsync(address, port, cts.Token);
            sw.Stop();
            return (true, sw.ElapsedMilliseconds);
        }
        catch
        {
            return (false, 0);
        }
    }
}
