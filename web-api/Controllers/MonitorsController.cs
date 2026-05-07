using Microsoft.AspNetCore.Mvc;
using Wintrich.NetworkApi.DTOs;
using Wintrich.NetworkApi.Infrastructure.Security;
using Wintrich.NetworkApi.Services;

namespace Wintrich.NetworkApi.Controllers;

/// <summary>
/// CRUD endpoints for scheduled monitors. Persistence is file-based; checks run in the
/// background via <see cref="MonitorBackgroundService"/>.
/// </summary>
[ApiController]
[Route("api/monitors")]
[Produces("application/json")]
public sealed class MonitorsController(
    MonitorStore store,
    UrlValidator validator,
    ILogger<MonitorsController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IEnumerable<MonitorEntry>>(StatusCodes.Status200OK)]
    public IActionResult List() => Ok(store.All());

    [HttpGet("{id}")]
    [ProducesResponseType<MonitorEntry>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Get(string id)
    {
        var m = store.Get(id);
        return m is null ? NotFound() : Ok(m);
    }

    [HttpPost]
    [ProducesResponseType<MonitorEntry>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMonitorRequest req)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Host))
            return BadRequest(new { error = "host is required" });

        validator.ValidateHost(req.Host.Trim());
        var monitor = await store.AddAsync(req);
        logger.LogInformation("Monitor {Id} created for {Host}", monitor.Id, monitor.Host);
        return CreatedAtAction(nameof(Get), new { id = monitor.Id }, monitor);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        var ok = await store.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
