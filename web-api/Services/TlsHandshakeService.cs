using System.Diagnostics;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Establishes a single TLS connection and records the elapsed time for each phase
/// of the connection lifecycle: DNS lookup, TCP connect, TLS handshake, first byte.
/// Designed for live waterfall visualization.
/// </summary>
public sealed class TlsHandshakeService(ILogger<TlsHandshakeService> logger)
{
    private const int DefaultPort = 443;
    private const int Timeout = 10000;

    public async Task<TlsHandshakeResponse> InspectAsync(string host, int port = DefaultPort, CancellationToken ct = default)
    {
        var phases = new List<TlsHandshakePhase>(5);
        var totalSw = Stopwatch.StartNew();
        string? resolvedIp = null;
        string? protocol = null;
        string? cipherSuite = null;
        string? issuer = null;
        string? subject = null;
        long? daysUntilExpiry = null;
        string? error = null;

        TcpClient? tcp = null;
        SslStream? ssl = null;

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(Timeout);

            // ── Phase 1: DNS resolve ─────────────────────────────────
            var phaseStart = totalSw.ElapsedMilliseconds;
            var phaseSw = Stopwatch.StartNew();
            IPAddress[] addrs;
            try
            {
                addrs = await Dns.GetHostAddressesAsync(host, cts.Token);
                phaseSw.Stop();
                var ip = Array.Find(addrs, a => a.AddressFamily == AddressFamily.InterNetwork) ?? addrs.FirstOrDefault();
                resolvedIp = ip?.ToString();
                phases.Add(new TlsHandshakePhase(
                    Name: "DNS",
                    Description: "Resolve hostname to IP address",
                    StartMs: phaseStart,
                    DurationMs: phaseSw.ElapsedMilliseconds,
                    Success: ip is not null,
                    Detail: resolvedIp is null ? "No address returned" : $"{addrs.Length} address(es) — using {resolvedIp}"));

                if (ip is null) throw new Exception("DNS resolution returned no addresses");
            }
            catch
            {
                phaseSw.Stop();
                phases.Add(new TlsHandshakePhase("DNS", "Resolve hostname to IP address",
                    phaseStart, phaseSw.ElapsedMilliseconds, false, "Lookup failed"));
                throw;
            }

            // ── Phase 2: TCP connect ─────────────────────────────────
            phaseStart = totalSw.ElapsedMilliseconds;
            phaseSw.Restart();
            tcp = new TcpClient();
            try
            {
                await tcp.ConnectAsync(host, port, cts.Token);
                phaseSw.Stop();
                phases.Add(new TlsHandshakePhase(
                    Name: "TCP",
                    Description: "Open TCP socket to port " + port,
                    StartMs: phaseStart,
                    DurationMs: phaseSw.ElapsedMilliseconds,
                    Success: true,
                    Detail: $"Connected to {resolvedIp}:{port}"));
            }
            catch (Exception ex)
            {
                phaseSw.Stop();
                phases.Add(new TlsHandshakePhase("TCP", "Open TCP socket to port " + port,
                    phaseStart, phaseSw.ElapsedMilliseconds, false, ex.Message));
                throw;
            }

            // ── Phase 3: TLS handshake ───────────────────────────────
            phaseStart = totalSw.ElapsedMilliseconds;
            phaseSw.Restart();
            ssl = new SslStream(tcp.GetStream(), leaveInnerStreamOpen: false);
            try
            {
                await ssl.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
                {
                    TargetHost = host,
                    RemoteCertificateValidationCallback = (_, _, _, _) => true,
                }, cts.Token);
                phaseSw.Stop();

                protocol = FormatProtocol(ssl.SslProtocol);
                cipherSuite = ssl.NegotiatedCipherSuite.ToString();

                phases.Add(new TlsHandshakePhase(
                    Name: "TLS",
                    Description: "Negotiate TLS session and validate certificate",
                    StartMs: phaseStart,
                    DurationMs: phaseSw.ElapsedMilliseconds,
                    Success: true,
                    Detail: $"{protocol} · {cipherSuite}"));

                if (ssl.RemoteCertificate is { } raw)
                {
                    var cert = X509CertificateLoader.LoadCertificate(raw.GetRawCertData());
                    issuer  = cert.GetNameInfo(X509NameType.SimpleName, true);
                    subject = cert.GetNameInfo(X509NameType.SimpleName, false);
                    if (string.IsNullOrWhiteSpace(issuer))  issuer  = cert.Issuer;
                    if (string.IsNullOrWhiteSpace(subject)) subject = cert.Subject;
                    daysUntilExpiry = (long)(cert.NotAfter.ToUniversalTime() - DateTime.UtcNow).TotalDays;
                }
            }
            catch (AuthenticationException ex)
            {
                phaseSw.Stop();
                phases.Add(new TlsHandshakePhase("TLS", "Negotiate TLS session and validate certificate",
                    phaseStart, phaseSw.ElapsedMilliseconds, false, ex.Message));
                throw;
            }

            // ── Phase 4: HTTP request + first byte ───────────────────
            phaseStart = totalSw.ElapsedMilliseconds;
            phaseSw.Restart();
            try
            {
                var requestBytes = System.Text.Encoding.ASCII.GetBytes(
                    $"GET / HTTP/1.1\r\nHost: {host}\r\nUser-Agent: Wintrich.Tech\r\nAccept: */*\r\nConnection: close\r\n\r\n");
                await ssl.WriteAsync(requestBytes, cts.Token);
                await ssl.FlushAsync(cts.Token);

                var buf = new byte[1];
                var read = await ssl.ReadAsync(buf, cts.Token);
                phaseSw.Stop();

                phases.Add(new TlsHandshakePhase(
                    Name: "TTFB",
                    Description: "Send HTTP request and wait for first response byte",
                    StartMs: phaseStart,
                    DurationMs: phaseSw.ElapsedMilliseconds,
                    Success: read > 0,
                    Detail: read > 0 ? "First byte received" : "Connection closed before any response"));
            }
            catch (Exception ex)
            {
                phaseSw.Stop();
                phases.Add(new TlsHandshakePhase("TTFB", "Send HTTP request and wait for first response byte",
                    phaseStart, phaseSw.ElapsedMilliseconds, false, ex.Message));
                // TTFB failure isn't fatal — we still have valid TLS info
            }
        }
        catch (OperationCanceledException)
        {
            error = "TLS connection timed out";
            logger.LogWarning("TLS handshake timeout for {Host}", host);
        }
        catch (Exception ex)
        {
            error = ex.Message;
            logger.LogWarning(ex, "TLS handshake failed for {Host}", host);
        }
        finally
        {
            ssl?.Dispose();
            tcp?.Dispose();
            totalSw.Stop();
        }

        return new TlsHandshakeResponse(
            Host: host,
            Port: port,
            ResolvedIp: resolvedIp,
            Protocol: protocol,
            CipherSuite: cipherSuite,
            Issuer: issuer,
            Subject: subject,
            CertDaysUntilExpiry: daysUntilExpiry,
            TotalMs: totalSw.ElapsedMilliseconds,
            Timestamp: DateTime.UtcNow,
            Phases: phases,
            Error: error);
    }

#pragma warning disable SYSLIB0039
    private static string FormatProtocol(SslProtocols protocol) => protocol switch
    {
        SslProtocols.Tls13 => "TLSv1.3",
        SslProtocols.Tls12 => "TLSv1.2",
        SslProtocols.Tls11 => "TLSv1.1",
        SslProtocols.Tls   => "TLSv1.0",
        _                  => protocol.ToString()
    };
#pragma warning restore SYSLIB0039
}
