package tech.wintrich.networkapi.presentation.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Response DTO for TLS/SSL certificate information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "TLS/SSL certificate and connection information")
public class TlsInfoResponse {

    @Schema(description = "Target host", example = "example.com")
    private String host;

    @Schema(description = "TLS protocol version", example = "TLSv1.3")
    private String protocol;

    @Schema(description = "Cipher suite used", example = "TLS_AES_256_GCM_SHA384")
    private String cipherSuite;

    @Schema(description = "Certificate issuer", example = "DigiCert Inc")
    private String issuer;

    @Schema(description = "Certificate subject (domain)", example = "example.com")
    private String subject;

    @Schema(description = "Certificate valid from date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate validFrom;

    @Schema(description = "Certificate valid until date", example = "2026-08-10")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate validUntil;

    @Schema(description = "Days until certificate expires", example = "177")
    private Long daysUntilExpiry;

    @Schema(description = "Whether certificate is expired", example = "false")
    private Boolean expired;

    @Schema(description = "Certificate serial number")
    private String serialNumber;

    @Schema(description = "Subject Alternative Names (SANs)")
    private String[] subjectAlternativeNames;

    @Schema(description = "Error message if TLS check failed")
    private String error;
}
