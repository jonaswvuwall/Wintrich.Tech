package tech.wintrich.networkapi.presentation.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for ping/connectivity check
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Connectivity and latency information for a host")
public class PingResponse {

    @Schema(description = "Target host or domain", example = "example.com")
    private String host;

    @Schema(description = "Resolved IP address", example = "93.184.216.34")
    private String ip;

    @Schema(description = "Whether the host is reachable", example = "true")
    private boolean reachable;

    @Schema(description = "Latency in milliseconds", example = "34")
    private Long latencyMs;

    @Schema(description = "Timestamp of the check")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime timestamp;

    @Schema(description = "Error message if check failed")
    private String error;
}
