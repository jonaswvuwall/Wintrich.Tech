using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// Lightweight TCP-connect port scanner.
/// Scans a curated list of well-known service ports against a single host
/// with a strict timeout and bounded concurrency. Tries to grab a small
/// banner from any port that connects.
/// </summary>
public sealed class PortScanService(ILogger<PortScanService> logger)
{
    private const int ConnectTimeoutMs = 1500;
    private const int BannerTimeoutMs  = 800;
    private const int MaxConcurrency   = 32;

    /// <summary>Curated list of common ports + nice service names.</summary>
    private static readonly (int Port, string Name)[] CommonPorts =
    {
        // ── well-known (0–1023) ──────────────────────────────────
        (20,  "ftp-data"), (21,  "ftp"),     (22,  "ssh"),     (23,  "telnet"),
        (25,  "smtp"),     (53,  "dns"),     (67,  "dhcp"),    (69,  "tftp"),
        (80,  "http"),     (88,  "kerberos"),(110, "pop3"),    (111, "rpcbind"),
        (119, "nntp"),     (123, "ntp"),     (135, "msrpc"),   (137, "netbios-ns"),
        (138, "netbios-dgm"), (139, "netbios-ssn"), (143, "imap"),
        (161, "snmp"),     (162, "snmptrap"),(179, "bgp"),     (194, "irc"),
        (389, "ldap"),     (443, "https"),   (445, "smb"),     (465, "smtps"),
        (500, "isakmp"),   (514, "syslog"),  (515, "lpd"),     (520, "rip"),
        (587, "submission"),(631, "ipp"),    (636, "ldaps"),   (873, "rsync"),
        (902, "vmware"),   (989, "ftps-data"), (990, "ftps"),  (993, "imaps"),
        (995, "pop3s"),

        // ── registered (1024–49151) — popular services ───────────
        (1080, "socks"),   (1194, "openvpn"),(1433, "mssql"),  (1434, "mssql-mon"),
        (1521, "oracle"),  (1701, "l2tp"),   (1723, "pptp"),   (1812, "radius"),
        (1883, "mqtt"),    (2049, "nfs"),    (2082, "cpanel"), (2083, "cpanel-ssl"),
        (2086, "whm"),     (2087, "whm-ssl"),(2095, "webmail"),(2096, "webmail-ssl"),
        (2181, "zookeeper"),(2222, "directadmin"),(2375, "docker"),(2376, "docker-tls"),
        (2483, "oracle-db"),(2484, "oracle-db-ssl"),(2638, "sybase"),
        (3000, "node-dev"),(3001, "node-alt"),(3128, "squid"),(3260, "iscsi"),
        (3268, "ldap-gc"), (3269, "ldap-gc-ssl"),(3306, "mysql"),(3389, "rdp"),
        (3478, "stun"),    (3690, "svn"),    (4000, "dev-server"),(4040, "yarn-ui"),
        (4369, "epmd"),    (4500, "ipsec-nat"),(4567, "websocket-dev"),(4789, "vxlan"),
        (4848, "glassfish"),(5000, "upnp"),  (5001, "synology"),(5060, "sip"),
        (5061, "sips"),    (5222, "xmpp-client"),(5269, "xmpp-server"),
        (5353, "mdns"),    (5432, "postgres"),(5601, "kibana"),(5672, "amqp"),
        (5683, "coap"),    (5800, "vnc-http"),(5900, "vnc"),  (5984, "couchdb"),
        (6000, "x11"),     (6379, "redis"), (6443, "kubernetes"),(6514, "syslog-tls"),
        (6660, "irc"),     (6667, "irc"),   (6697, "irc-tls"), (7001, "weblogic"),
        (7077, "spark"),   (7474, "neo4j"), (7547, "tr-069"), (7687, "neo4j-bolt"),
        (8000, "http-alt"),(8008, "http-alt"),(8009, "ajp13"),(8080, "http-proxy"),
        (8081, "http-alt"),(8086, "influxdb"),(8088, "http-alt"),(8089, "splunk"),
        (8090, "http-alt"),(8096, "jellyfin"),(8123, "home-assistant"),
        (8200, "vault"),   (8333, "bitcoin"),(8443, "https-alt"),(8500, "consul"),
        (8530, "wsus"),    (8531, "wsus-ssl"),(8554, "rtsp"),(8649, "ganglia"),
        (8765, "websocket"),(8800, "http-alt"),(8888, "http-alt"),(8983, "solr"),
        (9000, "php-fpm"), (9001, "tor"),   (9042, "cassandra"),(9080, "http-alt"),
        (9090, "prometheus"),(9091, "transmission"),(9092, "kafka"),(9100, "printer"),
        (9200, "elasticsearch"),(9300, "elasticsearch-cluster"),(9418, "git"),
        (9443, "https-alt"),(9527, "ipcam"),(9600, "logstash"),(9999, "abyss"),
        (10000, "webmin"), (11211, "memcached"),(15672, "rabbitmq-mgmt"),
        (16379, "redis-cluster"),(19999, "netdata"),(20000, "dnp3"),
        (25565, "minecraft"),(27017, "mongodb"),(27018, "mongodb-shard"),
        (27019, "mongodb-config"),(28015, "rethinkdb"),(28017, "mongodb-status"),
        (32400, "plex"),    (49152, "upnp-dyn"),

        // ── high / dynamic — common malware / leaked services ────
        (1337, "elite"),    (4444, "metasploit"),(5555, "adb"),
        (6666, "irc-alt"),  (12345, "netbus"),(31337, "elite-back"),
        (54321, "back-orifice"),
    };

    public async Task<PortScanResponse> ScanAsync(string host, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        string? resolvedIp = null;

        try
        {
            var addrs = await Dns.GetHostAddressesAsync(host, ct);
            var ip = Array.Find(addrs, a => a.AddressFamily == AddressFamily.InterNetwork)
                     ?? addrs.FirstOrDefault();
            resolvedIp = ip?.ToString();
            if (ip is null)
                return new PortScanResponse(host, null, 0, 0, sw.ElapsedMilliseconds, DateTime.UtcNow,
                    Array.Empty<PortScanResult>(), "DNS resolution returned no addresses");
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new PortScanResponse(host, null, 0, 0, sw.ElapsedMilliseconds, DateTime.UtcNow,
                Array.Empty<PortScanResult>(), $"DNS lookup failed: {ex.Message}");
        }

        using var sem = new SemaphoreSlim(MaxConcurrency);
        var tasks = CommonPorts.Select(async pair =>
        {
            await sem.WaitAsync(ct);
            try { return await ProbeAsync(host, pair.Port, pair.Name, ct); }
            finally { sem.Release(); }
        }).ToArray();

        var results = await Task.WhenAll(tasks);
        sw.Stop();

        return new PortScanResponse(
            Host: host,
            ResolvedIp: resolvedIp,
            PortsScanned: results.Length,
            OpenCount: results.Count(r => r.Open),
            TotalDurationMs: sw.ElapsedMilliseconds,
            Timestamp: DateTime.UtcNow,
            Results: results,
            Error: null);
    }

    private async Task<PortScanResult> ProbeAsync(string host, int port, string name, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            using var tcp = new TcpClient();
            using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            connectCts.CancelAfter(ConnectTimeoutMs);

            await tcp.ConnectAsync(host, port, connectCts.Token);
            sw.Stop();

            string? banner = await TryGrabBannerAsync(tcp, ct);

            return new PortScanResult(
                Port: port,
                Service: name,
                Category: Category(port),
                Open: true,
                ResponseMs: sw.ElapsedMilliseconds,
                Banner: banner,
                Error: null);
        }
        catch (OperationCanceledException)
        {
            return new PortScanResult(port, name, Category(port), false, null, null, "timeout");
        }
        catch (SocketException ex)
        {
            // Refused / unreachable — closed
            return new PortScanResult(port, name, Category(port), false, null, null, ex.SocketErrorCode.ToString());
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Port probe {Port} failed", port);
            return new PortScanResult(port, name, Category(port), false, null, null, ex.GetType().Name);
        }
    }

    private static async Task<string?> TryGrabBannerAsync(TcpClient tcp, CancellationToken ct)
    {
        try
        {
            using var bannerCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            bannerCts.CancelAfter(BannerTimeoutMs);

            var stream = tcp.GetStream();
            var buf = new byte[256];
            int read = await stream.ReadAsync(buf, bannerCts.Token);
            if (read <= 0) return null;
            var text = Encoding.ASCII.GetString(buf, 0, read);
            // Strip control chars; trim
            text = Regex.Replace(text, @"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "");
            text = text.Trim();
            return text.Length > 120 ? text[..120] + "…" : (text.Length == 0 ? null : text);
        }
        catch
        {
            return null;
        }
    }

    private static string Category(int port) => port switch
    {
        < 1024  => "well-known",
        < 49152 => "registered",
        _       => "dynamic",
    };
}
