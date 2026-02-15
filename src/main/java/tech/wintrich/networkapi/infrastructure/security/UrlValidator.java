package tech.wintrich.networkapi.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Validator for URLs and hosts to prevent SSRF attacks
 */
@Slf4j
@Component
public class UrlValidator {

    @Value("${api.network.security.block-internal-ips:true}")
    private boolean blockInternalIps;

    @Value("#{'${api.network.security.blocked-hosts}'.split(',')}")
    private List<String> blockedHosts;

    private static final Pattern VALID_DOMAIN_PATTERN = 
            Pattern.compile("^([a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$");

    private static final Pattern VALID_IP_PATTERN = 
            Pattern.compile("^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$");

    /**
     * Validates a URL for SSRF vulnerabilities
     *
     * @param url the URL to validate
     * @throws SecurityException if URL is invalid or blocked
     */
    public void validateUrl(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();

            if (host == null) {
                throw new SecurityException("Invalid URL: no host specified");
            }

            validateHost(host);

            // Only allow HTTP and HTTPS
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new SecurityException("Only HTTP and HTTPS protocols are allowed");
            }

        } catch (IllegalArgumentException e) {
            throw new SecurityException("Invalid URL format: " + e.getMessage());
        }
    }

    /**
     * Validates a host (domain or IP) for security issues
     *
     * @param host the host to validate
     * @throws SecurityException if host is invalid or blocked
     */
    public void validateHost(String host) {
        if (host == null || host.trim().isEmpty()) {
            throw new SecurityException("Host cannot be empty");
        }

        host = host.trim().toLowerCase();

        // Check blocked hosts list
        if (blockedHosts.contains(host)) {
            log.warn("Blocked host access attempt: {}", host);
            throw new SecurityException("Access to this host is not allowed");
        }

        // Check for localhost variants
        if (isLocalhost(host)) {
            log.warn("Localhost access attempt: {}", host);
            throw new SecurityException("Access to localhost is not allowed");
        }

        // Validate format (domain or IP)
        if (!isValidDomain(host) && !isValidIp(host)) {
            throw new SecurityException("Invalid host format");
        }

        // Check for internal IPs if blocking is enabled
        if (blockInternalIps) {
            try {
                InetAddress address = InetAddress.getByName(host);
                if (isInternalIp(address)) {
                    log.warn("Internal IP access attempt: {}", host);
                    throw new SecurityException("Access to internal IPs is not allowed");
                }
            } catch (UnknownHostException e) {
                // If we can't resolve it, let it pass - the actual service will handle it
                log.debug("Could not resolve host for IP check: {}", host);
            }
        }
    }

    /**
     * Checks if host is localhost
     */
    private boolean isLocalhost(String host) {
        return host.equals("localhost") ||
               host.equals("127.0.0.1") ||
               host.equals("0.0.0.0") ||
               host.equals("::1") ||
               host.startsWith("127.") ||
               host.equals("[::1]");
    }

    /**
     * Checks if the address is an internal/private IP
     */
    private boolean isInternalIp(InetAddress address) {
        return address.isLoopbackAddress() ||
               address.isLinkLocalAddress() ||
               address.isSiteLocalAddress() ||
               address.isAnyLocalAddress() ||
               isPrivateIpRange(address.getHostAddress());
    }

    /**
     * Checks if IP is in private ranges
     */
    private boolean isPrivateIpRange(String ip) {
        // 10.0.0.0/8
        if (ip.startsWith("10.")) return true;
        
        // 172.16.0.0/12
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                int second = Integer.parseInt(parts[1]);
                if (second >= 16 && second <= 31) return true;
            }
        }
        
        // 192.168.0.0/16
        if (ip.startsWith("192.168.")) return true;
        
        // 169.254.0.0/16 (link-local)
        if (ip.startsWith("169.254.")) return true;
        
        return false;
    }

    /**
     * Validates domain format
     */
    private boolean isValidDomain(String domain) {
        return VALID_DOMAIN_PATTERN.matcher(domain).matches();
    }

    /**
     * Validates IP format
     */
    private boolean isValidIp(String ip) {
        return VALID_IP_PATTERN.matcher(ip).matches();
    }
}
