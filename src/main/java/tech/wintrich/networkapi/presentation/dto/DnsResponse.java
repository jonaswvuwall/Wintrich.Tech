package tech.wintrich.networkapi.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for DNS information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DNS intelligence and records for a domain")
public class DnsResponse {

    @Schema(description = "Target domain", example = "example.com")
    private String domain;

    @Schema(description = "A (IPv4 address) records", example = "[\"93.184.216.34\"]")
    private List<String> aRecords;

    @Schema(description = "AAAA (IPv6 address) records")
    private List<String> aaaaRecords;

    @Schema(description = "MX (mail exchange) records")
    private List<String> mxRecords;

    @Schema(description = "NS (nameserver) records", example = "[\"a.iana-servers.net\", \"b.iana-servers.net\"]")
    private List<String> nsRecords;

    @Schema(description = "TXT records")
    private List<String> txtRecords;

    @Schema(description = "TTL (time to live) in seconds", example = "86400")
    private Long ttl;

    @Schema(description = "Error message if lookup failed")
    private String error;
}
