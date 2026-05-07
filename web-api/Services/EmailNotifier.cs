using System.Net;
using System.Net.Mail;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Sends alert emails over SMTP. Configuration is read from "Smtp" section. If SMTP is not
/// configured, the notifier logs the alert instead of sending — useful in dev/free tiers.
/// </summary>
public sealed class EmailNotifier(IConfiguration config, ILogger<EmailNotifier> logger)
{
    private readonly string? _host     = config["Smtp:Host"];
    private readonly int     _port     = config.GetValue("Smtp:Port", 587);
    private readonly string? _user     = config["Smtp:Username"];
    private readonly string? _password = config["Smtp:Password"];
    private readonly string  _from     = config["Smtp:From"] ?? "alerts@wintrich.tech";
    private readonly bool    _enableSsl = config.GetValue("Smtp:EnableSsl", true);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_host);

    public async Task SendAsync(string to, string subject, string body)
    {
        if (!IsConfigured)
        {
            logger.LogWarning("[email-stub] SMTP not configured — would have sent to {To}: {Subject}\n{Body}",
                to, subject, body);
            return;
        }

        try
        {
            using var msg = new MailMessage(_from, to, subject, body) { IsBodyHtml = false };
            using var client = new SmtpClient(_host!, _port) { EnableSsl = _enableSsl };
            if (!string.IsNullOrWhiteSpace(_user))
                client.Credentials = new NetworkCredential(_user, _password);

            await client.SendMailAsync(msg);
            logger.LogInformation("Sent alert email to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send alert email to {To}", to);
        }
    }
}
