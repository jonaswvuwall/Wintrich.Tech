using Microsoft.AspNetCore.Mvc;
using Wintrich.NetworkApi.DTOs;
using Wintrich.NetworkApi.Infrastructure.Security;
using Wintrich.NetworkApi.Services;

namespace Wintrich.NetworkApi.Controllers;

/// <summary>
/// Public read endpoint + share endpoint for Full Domain Reports.
///   POST /api/reports          → run + persist a report, return permalink
///   POST /api/reports/share    → persist an existing report payload (sent by the SPA)
///   GET  /api/reports/{id}     → fetch a previously shared report
/// </summary>
[ApiController]
[Route("api/reports")]
[Produces("application/json")]
public sealed class ReportsController(
    FullReportService reports,
    ReportStore store,
    UrlValidator validator,
    ILogger<ReportsController> logger) : ControllerBase
{
    /// <summary>Run a full report for the given host AND immediately persist a shareable copy.</summary>
    [HttpPost]
    [ProducesResponseType<SharedReportResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromQuery] string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
            return BadRequest(new { error = "host query parameter is required" });

        validator.ValidateHost(host.Trim());
        var report = await reports.RunAsync(host.Trim());
        var id = await store.SaveAsync(report);
        var url = $"{Request.Scheme}://{Request.Host}/api/reports/{id}";
        return Created(url, new SharedReportResponse(id, url, DateTime.UtcNow.Add(store.Retention)));
    }

    /// <summary>Persist an already-computed report (sent by the SPA after running probes client-side).</summary>
    [HttpPost("share")]
    [ProducesResponseType<SharedReportResponse>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Share([FromBody] FullReportResponse report)
    {
        if (report is null || string.IsNullOrWhiteSpace(report.Host))
            return BadRequest(new { error = "report body is required" });

        validator.ValidateHost(report.Host.Trim());
        var id = await store.SaveAsync(report);
        var url = $"{Request.Scheme}://{Request.Host}/api/reports/{id}";
        logger.LogInformation("Shared report {Id} created for {Host}", id, report.Host);
        return Created(url, new SharedReportResponse(id, url, DateTime.UtcNow.Add(store.Retention)));
    }

    /// <summary>Retrieve a previously shared report by its permalink ID.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType<FullReportResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string id)
    {
        var report = await store.GetAsync(id);
        return report is null ? NotFound() : Ok(report);
    }
}
