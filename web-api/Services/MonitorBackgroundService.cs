using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Periodically runs each registered monitor and sends an alert email when:
///   • the host becomes unreachable / HTTP returns 5xx
///   • the TLS certificate is within the configured warning window
///   • the certificate has expired
///
/// Re-alerts are throttled (one alert per condition per 24 h).
/// </summary>
public sealed class MonitorBackgroundService(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<MonitorBackgroundService> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(
        Math.Max(1, config.GetValue("Monitors:IntervalMinutes", 15)));
    private readonly TimeSpan _alertCooldown = TimeSpan.FromHours(
        Math.Max(1, config.GetValue("Monitors:AlertCooldownHours", 24)));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small delay so the web server can finish starting up
        try { await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); }
        catch (OperationCanceledException) { return; }

        logger.LogInformation("Monitor background service started (interval = {Minutes} min)", _interval.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await TickAsync(stoppingToken); }
            catch (Exception ex) { logger.LogError(ex, "Monitor tick failed"); }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var store    = scope.ServiceProvider.GetRequiredService<MonitorStore>();
        var tls      = scope.ServiceProvider.GetRequiredService<TlsService>();
        var http     = scope.ServiceProvider.GetRequiredService<HttpAnalysisService>();
        var notifier = scope.ServiceProvider.GetRequiredService<EmailNotifier>();

        foreach (var monitor in store.All())
        {
            if (ct.IsCancellationRequested) break;

            var alerts = new List<string>();
            string status = "ok";
            string? error = null;
            long? expiryDays = null;
            int? httpStatus = null;

            // TLS check
            if (monitor.CheckTls)
            {
                try
                {
                    var t = await tls.InspectAsync(monitor.Host);
                    if (t.Error != null) { alerts.Add($"TLS check failed: {t.Error}"); status = "fail"; error = t.Error; }
                    else
                    {
                        expiryDays = t.DaysUntilExpiry;
                        if (t.Expired == true) { alerts.Add($"Certificate has EXPIRED for {monitor.Host}."); status = "fail"; }
                        else if (expiryDays is { } d && d <= monitor.CertWarnDays)
                            alerts.Add($"Certificate for {monitor.Host} expires in {d} day(s).");
                    }
                }
                catch (Exception ex) { alerts.Add($"TLS check threw: {ex.Message}"); error = ex.Message; status = "fail"; }
            }

            // HTTP check
            if (monitor.CheckHttp)
            {
                try
                {
                    var h = await http.AnalyzeAsync($"https://{monitor.Host}");
                    httpStatus = h.Status;
                    if (h.Error != null) { alerts.Add($"HTTP check failed: {h.Error}"); status = "fail"; error ??= h.Error; }
                    else if (h.Status is null or >= 500) { alerts.Add($"HTTP returned {h.Status?.ToString() ?? "no response"}."); status = "fail"; }
                }
                catch (Exception ex) { alerts.Add($"HTTP check threw: {ex.Message}"); error ??= ex.Message; status = "fail"; }
            }

            DateTime? alertAt = monitor.LastAlertAt;
            string? alertReason = monitor.LastAlertReason;

            if (alerts.Count > 0 && !string.IsNullOrWhiteSpace(monitor.Email))
            {
                var combined = string.Join(" | ", alerts);
                var coolDownActive = monitor.LastAlertAt.HasValue
                                     && DateTime.UtcNow - monitor.LastAlertAt.Value < _alertCooldown
                                     && string.Equals(monitor.LastAlertReason, combined, StringComparison.Ordinal);

                if (!coolDownActive)
                {
                    var subject = $"[Wintrich.tech] Alert for {monitor.Host}";
                    var body = $"Alerts for {monitor.Host} at {DateTime.UtcNow:u}:\n\n - " +
                               string.Join("\n - ", alerts) +
                               "\n\nMonitor ID: " + monitor.Id;
                    await notifier.SendAsync(monitor.Email!, subject, body);
                    alertAt = DateTime.UtcNow;
                    alertReason = combined;
                }
            }

            await store.UpdateAsync(monitor with
            {
                LastCheckedAt = DateTime.UtcNow,
                LastStatus = status,
                LastError = error,
                LastDaysUntilExpiry = expiryDays,
                LastHttpStatus = httpStatus,
                LastAlertAt = alertAt,
                LastAlertReason = alertReason,
            });
        }
    }
}
