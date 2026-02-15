package tech.wintrich.networkapi.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for HTTP analysis
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "HTTP analysis results including status, headers, and performance")
public class HttpAnalysisResponse {

    @Schema(description = "Target URL", example = "https://example.com")
    private String url;

    @Schema(description = "HTTP status code", example = "200")
    private Integer status;

    @Schema(description = "Status text", example = "OK")
    private String statusText;

    @Schema(description = "Response time in milliseconds", example = "182")
    private Long responseTimeMs;

    @Schema(description = "Content type", example = "text/html")
    private String contentType;

    @Schema(description = "Server header value", example = "nginx")
    private String server;

    @Schema(description = "Response headers")
    private Map<String, String> headers;

    @Schema(description = "Redirect chain (if any)")
    private String[] redirectChain;

    @Schema(description = "Final URL after redirects")
    private String finalUrl;

    @Schema(description = "Response body size in bytes", example = "1256")
    private Long contentLength;

    @Schema(description = "Error message if request failed")
    private String error;
}
