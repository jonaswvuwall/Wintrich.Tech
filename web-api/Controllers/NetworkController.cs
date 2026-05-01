using Microsoft.AspNetCore.Mvc;
using Wintrich.NetworkApi.DTOs;
using Wintrich.NetworkApi.Infrastructure.Security;
using Wintrich.NetworkApi.Services;

namespace Wintrich.NetworkApi.Controllers;

/// <summary>
/// Network Intelligence REST controller.
/// Exposes the same four endpoints as the Java NetworkController:
///   GET /api/network/ping?host=
///   GET /api/network/dns?domain=
///   GET /api/network/http-analysis?url=
///   GET /api/network/tls-info?host=
/// </summary>
[ApiController]
[Route("api/network")]
[Produces("application/json")]
public sealed class NetworkController(
    ConnectivityService connectivityService,
    DnsService dnsService,
    HttpAnalysisService httpAnalysisService,
    TlsService tlsService,
    SecurityHeadersService securityHeadersService,
    UrlValidator urlValidator,
    ILogger<NetworkController> logger) : ControllerBase
{
    /// <summary>Check connectivity and measure ICMP latency for a host.</summary>
    [HttpGet("ping")]
    [ProducesResponseType<PingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Ping([FromQuery] string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
            return BadRequest(new { error = "host query parameter is required" });

        logger.LogInformation("Ping request for host: {Host}", host);
        urlValidator.ValidateHost(host.Trim()); // throws NetworkSecurityException → 403

        var response = await connectivityService.PingAsync(host.Trim());
        return Ok(response);
    }

    /// <summary>Retrieve A, AAAA, MX, NS and TXT DNS records for a domain.</summary>
    [HttpGet("dns")]
    [ProducesResponseType<DnsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Dns([FromQuery] string? domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
            return BadRequest(new { error = "domain query parameter is required" });

        logger.LogInformation("DNS lookup request for domain: {Domain}", domain);
        urlValidator.ValidateHost(domain.Trim());

        var response = await dnsService.LookupAsync(domain.Trim());
        return Ok(response);
    }

    /// <summary>Analyse HTTP response: status, headers, timings, redirect chain.</summary>
    [HttpGet("http-analysis")]
    [ProducesResponseType<HttpAnalysisResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> HttpAnalysis([FromQuery] string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new { error = "url query parameter is required" });

        logger.LogInformation("HTTP analysis request for URL: {Url}", url);
        urlValidator.ValidateUrl(url.Trim());

        var response = await httpAnalysisService.AnalyzeAsync(url.Trim());
        return Ok(response);
    }

    /// <summary>Inspect the TLS certificate and connection details for a host on port 443.</summary>
    [HttpGet("tls-info")]
    [ProducesResponseType<TlsInfoResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> TlsInfo([FromQuery] string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
            return BadRequest(new { error = "host query parameter is required" });

        logger.LogInformation("TLS info request for host: {Host}", host);
        urlValidator.ValidateHost(host.Trim());

        var response = await tlsService.InspectAsync(host.Trim());
        return Ok(response);
    }

    /// <summary>Audit a URL for the presence of common HTTP security headers and assign a grade.</summary>
    [HttpGet("security-headers")]
    [ProducesResponseType<SecurityHeadersResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SecurityHeaders([FromQuery] string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new { error = "url query parameter is required" });

        logger.LogInformation("Security headers audit request for URL: {Url}", url);
        urlValidator.ValidateUrl(url.Trim());

        var response = await securityHeadersService.AuditAsync(url.Trim());
        return Ok(response);
    }
}
