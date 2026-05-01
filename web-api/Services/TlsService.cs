using System.Formats.Asn1;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Caching.Memory;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// TLS/SSL certificate inspection service using SslStream.
/// Equivalent of the Java TlsService (SSLSocket + X509Certificate inspection).
/// Results are cached in IMemoryCache, mirroring @Cacheable(value = "tls").
/// </summary>
public sealed class TlsService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<TlsService> _logger;
    private readonly int _cacheTtl;
    private readonly int _tlsTimeout;

    private const int TlsPort = 443;

    public TlsService(IMemoryCache cache, IConfiguration configuration, ILogger<TlsService> logger)
    {
        _cache = cache;
        _logger = logger;
        _cacheTtl = configuration.GetValue<int>("Api:Network:Cache:TlsTtl", 3600);
        _tlsTimeout = configuration.GetValue<int>("Api:Network:Timeout:Tls", 5000);
    }

    public async Task<TlsInfoResponse> InspectAsync(string host)
    {
        var cacheKey = $"tls:{host.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out TlsInfoResponse? cached))
            return cached!;

        var result = await PerformInspectionAsync(host);
        if (result.Error == null)
            _cache.Set(cacheKey, result, TimeSpan.FromSeconds(_cacheTtl));

        return result;
    }

    private async Task<TlsInfoResponse> PerformInspectionAsync(string host)
    {
        _logger.LogDebug("Performing TLS inspection for host: {Host}", host);

        string? protocol = null;
        string? cipherSuite = null;
        string? issuer = null;
        string? subject = null;
        DateOnly? validFrom = null;
        DateOnly? validUntil = null;
        long? daysUntilExpiry = null;
        bool? expired = null;
        string? serialNumber = null;
        string[]? sans = null;
        string? error = null;

        TcpClient? tcpClient = null;
        SslStream? sslStream = null;

        try
        {
            using var cts = new CancellationTokenSource(_tlsTimeout);

            tcpClient = new TcpClient();
            await tcpClient.ConnectAsync(host, TlsPort, cts.Token);

            sslStream = new SslStream(
                tcpClient.GetStream(),
                leaveInnerStreamOpen: false,
                // Accept any certificate — we are inspecting, not validating
                userCertificateValidationCallback: (_, _, _, _) => true);

            await sslStream.AuthenticateAsClientAsync(
                new SslClientAuthenticationOptions
                {
                    TargetHost = host,
                    RemoteCertificateValidationCallback = (_, _, _, _) => true
                },
                cts.Token);

            // --- Protocol ---
            protocol = FormatProtocol(sslStream.SslProtocol);

            // --- Cipher suite ---
            cipherSuite = sslStream.NegotiatedCipherSuite.ToString();

            // --- Certificate details ---
            if (sslStream.RemoteCertificate != null)
            {
                var cert = X509CertificateLoader.LoadCertificate(sslStream.RemoteCertificate.GetRawCertData());

                // X509NameType.SimpleName maps to the CN (Common Name) field
                issuer = cert.GetNameInfo(X509NameType.SimpleName, forIssuer: true);
                if (string.IsNullOrWhiteSpace(issuer)) issuer = cert.Issuer;

                subject = cert.GetNameInfo(X509NameType.SimpleName, forIssuer: false);
                if (string.IsNullOrWhiteSpace(subject)) subject = cert.Subject;

                validFrom = DateOnly.FromDateTime(cert.NotBefore.ToUniversalTime());
                validUntil = DateOnly.FromDateTime(cert.NotAfter.ToUniversalTime());

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                daysUntilExpiry = (long)(cert.NotAfter.ToUniversalTime() - DateTime.UtcNow).TotalDays;
                expired = daysUntilExpiry < 0;

                serialNumber = cert.SerialNumber?.ToUpperInvariant();

                sans = ExtractDnsNames(cert);
            }
        }
        catch (OperationCanceledException)
        {
            error = "TLS connection timed out";
            _logger.LogError("TLS timeout for host: {Host}", host);
        }
        catch (AuthenticationException ex)
        {
            // We accept all certs, so this is unexpected — report it
            error = $"TLS handshake failed: {ex.Message}";
            _logger.LogError(ex, "TLS handshake failed for host: {Host}", host);
        }
        catch (Exception ex)
        {
            error = $"TLS connection failed: {ex.Message}";
            _logger.LogError(ex, "TLS inspection failed for host: {Host}", host);
        }
        finally
        {
            sslStream?.Dispose();
            tcpClient?.Dispose();
        }

        return new TlsInfoResponse(
            host, protocol, cipherSuite,
            issuer, subject, validFrom, validUntil,
            daysUntilExpiry, expired, serialNumber, sans, error);
    }

    /// <summary>Formats the SslProtocols enum to the standard "TLSv1.X" string used in the Java API.</summary>
#pragma warning disable SYSLIB0039 // TLS 1.0/1.1 enum values are obsolete but referenced for display only
    private static string FormatProtocol(SslProtocols protocol) => protocol switch
    {
        SslProtocols.Tls13 => "TLSv1.3",
        SslProtocols.Tls12 => "TLSv1.2",
        SslProtocols.Tls11 => "TLSv1.1",
        SslProtocols.Tls   => "TLSv1.0",
        _                  => protocol.ToString()
    };
#pragma warning restore SYSLIB0039

    /// <summary>
    /// Extracts DNS Subject Alternative Names (SANs) by decoding the ASN.1 extension directly.
    /// OID 2.5.29.17 = SubjectAltName. Context tag [2] = dNSName (IA5String).
    /// </summary>
    private string[] ExtractDnsNames(X509Certificate2 cert)
    {
        var names = new List<string>();
        try
        {
            var sanExt = cert.Extensions["2.5.29.17"];
            if (sanExt == null) return Array.Empty<string>();

            var reader = new AsnReader(sanExt.RawData, AsnEncodingRules.DER);
            var sequence = reader.ReadSequence();

            while (sequence.HasData)
            {
                var tag = sequence.PeekTag();
                if (tag.TagClass == TagClass.ContextSpecific && tag.TagValue == 2)
                {
                    // dNSName [2] IMPLICIT IA5String — read as a character string with the context tag
                    var dnsName = sequence.ReadCharacterString(
                        UniversalTagNumber.IA5String,
                        new Asn1Tag(TagClass.ContextSpecific, 2, isConstructed: false));
                    names.Add(dnsName);
                }
                else
                {
                    sequence.ReadEncodedValue(); // skip other GeneralName types
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not parse SANs for cert: {Msg}", ex.Message);
        }

        return names.ToArray();
    }
}
