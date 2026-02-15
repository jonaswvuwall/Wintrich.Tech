package tech.wintrich.networkapi.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tech.wintrich.networkapi.application.service.ConnectivityService;
import tech.wintrich.networkapi.application.service.DnsService;
import tech.wintrich.networkapi.application.service.HttpAnalysisService;
import tech.wintrich.networkapi.application.service.TlsService;
import tech.wintrich.networkapi.infrastructure.security.UrlValidator;
import tech.wintrich.networkapi.presentation.dto.DnsResponse;
import tech.wintrich.networkapi.presentation.dto.HttpAnalysisResponse;
import tech.wintrich.networkapi.presentation.dto.PingResponse;
import tech.wintrich.networkapi.presentation.dto.TlsInfoResponse;

/**
 * REST Controller for Network Intelligence API endpoints
 */
@Slf4j
@RestController
@RequestMapping("/api/network")
@RequiredArgsConstructor
@Validated
@Tag(name = "Network Intelligence", description = "API for analyzing connectivity, DNS, HTTP, and TLS")
@CrossOrigin(origins = "*")
public class NetworkController {

    private final ConnectivityService connectivityService;
    private final DnsService dnsService;
    private final HttpAnalysisService httpAnalysisService;
    private final TlsService tlsService;
    private final UrlValidator urlValidator;

    /**
     * Ping endpoint - checks connectivity and measures latency
     */
    @GetMapping("/ping")
    @Operation(
        summary = "Check connectivity and latency",
        description = "Performs a ping check to measure host reachability and latency"
    )
    public ResponseEntity<PingResponse> ping(
            @Parameter(description = "Target host or domain", example = "example.com")
            @RequestParam @NotBlank String host) {
        
        log.info("Ping request for host: {}", host);
        
        // Validate host
        urlValidator.validateHost(host);
        
        PingResponse response = connectivityService.ping(host);
        return ResponseEntity.ok(response);
    }

    /**
     * DNS lookup endpoint - retrieves DNS records
     */
    @GetMapping("/dns")
    @Operation(
        summary = "DNS intelligence lookup",
        description = "Retrieves comprehensive DNS records including A, AAAA, MX, NS, and TXT records"
    )
    public ResponseEntity<DnsResponse> dns(
            @Parameter(description = "Target domain", example = "example.com")
            @RequestParam @NotBlank String domain) {
        
        log.info("DNS lookup request for domain: {}", domain);
        
        // Validate domain
        urlValidator.validateHost(domain);
        
        DnsResponse response = dnsService.lookup(domain);
        return ResponseEntity.ok(response);
    }

    /**
     * HTTP analysis endpoint - analyzes HTTP response characteristics
     */
    @GetMapping("/http-analysis")
    @Operation(
        summary = "HTTP analysis and performance testing",
        description = "Analyzes HTTP response including status, headers, response time, and redirect chain"
    )
    public ResponseEntity<HttpAnalysisResponse> httpAnalysis(
            @Parameter(description = "Target URL", example = "https://example.com")
            @RequestParam @NotBlank String url) {
        
        log.info("HTTP analysis request for URL: {}", url);
        
        // Validate URL and check for SSRF
        urlValidator.validateUrl(url);
        
        HttpAnalysisResponse response = httpAnalysisService.analyze(url);
        return ResponseEntity.ok(response);
    }

    /**
     * TLS info endpoint - inspects SSL/TLS certificate
     */
    @GetMapping("/tls-info")
    @Operation(
        summary = "TLS/SSL certificate inspection",
        description = "Retrieves TLS protocol information and certificate details including issuer, expiration, and SANs"
    )
    public ResponseEntity<TlsInfoResponse> tlsInfo(
            @Parameter(description = "Target host", example = "example.com")
            @RequestParam @NotBlank String host) {
        
        log.info("TLS info request for host: {}", host);
        
        // Validate host
        urlValidator.validateHost(host);
        
        TlsInfoResponse response = tlsService.inspect(host);
        return ResponseEntity.ok(response);
    }
}
