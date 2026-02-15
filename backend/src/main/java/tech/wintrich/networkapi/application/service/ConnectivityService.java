package tech.wintrich.networkapi.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tech.wintrich.networkapi.presentation.dto.PingResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for connectivity and latency checks
 */
@Slf4j
@Service
public class ConnectivityService {

    @Value("${api.network.timeout.ping:3000}")
    private int pingTimeout;

    /**
     * Performs a ping check to the specified host
     *
     * @param host the target host or domain
     * @return PingResponse with connectivity information
     */
    public PingResponse ping(String host) {
        log.debug("Performing ping check for host: {}", host);

        PingResponse.PingResponseBuilder responseBuilder = PingResponse.builder()
                .host(host)
                .timestamp(LocalDateTime.now());

        try {
            // Resolve DNS first
            InetAddress inetAddress = InetAddress.getByName(host);
            String ip = inetAddress.getHostAddress();
            responseBuilder.ip(ip);

            // Try system ping for more accurate latency measurement
            Long latency = performSystemPing(host);
            
            if (latency != null) {
                responseBuilder.reachable(true).latencyMs(latency);
            } else {
                // Fallback to Java's isReachable
                long startTime = System.nanoTime();
                boolean reachable = inetAddress.isReachable(pingTimeout);
                long duration = (System.nanoTime() - startTime) / 1_000_000;

                responseBuilder
                        .reachable(reachable)
                        .latencyMs(reachable ? duration : null);
            }

        } catch (UnknownHostException e) {
            log.error("Unknown host: {}", host, e);
            responseBuilder
                    .reachable(false)
                    .error("Host not found: " + e.getMessage());
        } catch (IOException e) {
            log.error("IO error during ping: {}", host, e);
            responseBuilder
                    .reachable(false)
                    .error("Connection error: " + e.getMessage());
        }

        return responseBuilder.build();
    }

    /**
     * Attempts to perform system-level ping for more accurate results
     *
     * @param host the target host
     * @return latency in milliseconds, or null if failed
     */
    private Long performSystemPing(String host) {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            ProcessBuilder processBuilder;

            if (os.contains("win")) {
                // Windows: ping -n 1 host
                processBuilder = new ProcessBuilder("ping", "-n", "1", host);
            } else {
                // Linux/Mac: ping -c 1 host
                processBuilder = new ProcessBuilder("ping", "-c", "1", host);
            }

            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {

                String line;
                Pattern pattern = Pattern.compile("time[=<](\\d+\\.?\\d*)\\s*ms", Pattern.CASE_INSENSITIVE);

                while ((line = reader.readLine()) != null) {
                    Matcher matcher = pattern.matcher(line);
                    if (matcher.find()) {
                        return Math.round(Double.parseDouble(matcher.group(1)));
                    }
                }
            }

            process.waitFor();
            return null;

        } catch (Exception e) {
            log.warn("System ping failed for {}: {}", host, e.getMessage());
            return null;
        }
    }
}
