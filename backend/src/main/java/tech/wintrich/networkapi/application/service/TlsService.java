package tech.wintrich.networkapi.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import tech.wintrich.networkapi.presentation.dto.TlsInfoResponse;

import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.IOException;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Service for TLS/SSL certificate inspection
 */
@Slf4j
@Service
public class TlsService {

    private static final int TLS_PORT = 443;
    private static final int SOCKET_TIMEOUT = 5000;

    /**
     * Performs TLS/SSL certificate inspection for a host
     *
     * @param host the target host
     * @return TlsInfoResponse with certificate and connection information
     */
    @Cacheable(value = "tls", key = "#host")
    public TlsInfoResponse inspect(String host) {
        log.debug("Performing TLS inspection for host: {}", host);

        TlsInfoResponse.TlsInfoResponseBuilder responseBuilder = 
                TlsInfoResponse.builder().host(host);

        SSLSocket socket = null;
        try {
            // Create SSL socket
            SSLSocketFactory factory = (SSLSocketFactory) SSLSocketFactory.getDefault();
            socket = (SSLSocket) factory.createSocket(host, TLS_PORT);
            socket.setSoTimeout(SOCKET_TIMEOUT);

            // Start TLS handshake
            socket.startHandshake();

            // Get SSL session
            SSLSession session = socket.getSession();

            // Extract protocol and cipher suite
            responseBuilder
                    .protocol(session.getProtocol())
                    .cipherSuite(session.getCipherSuite());

            // Get certificates
            Certificate[] certificates = session.getPeerCertificates();
            if (certificates.length > 0 && certificates[0] instanceof X509Certificate) {
                X509Certificate cert = (X509Certificate) certificates[0];

                // Extract certificate information
                extractCertificateInfo(cert, responseBuilder);
            }

        } catch (IOException e) {
            log.error("TLS connection failed for host: {}", host, e);
            responseBuilder.error("TLS connection failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("TLS inspection failed for host: {}", host, e);
            responseBuilder.error("Certificate inspection failed: " + e.getMessage());
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (IOException e) {
                    log.warn("Failed to close socket: {}", e.getMessage());
                }
            }
        }

        return responseBuilder.build();
    }

    /**
     * Extracts detailed information from X509 certificate
     */
    private void extractCertificateInfo(X509Certificate cert, 
                                       TlsInfoResponse.TlsInfoResponseBuilder builder) {
        
        // Issuer
        String issuer = cert.getIssuerDN().getName();
        // Extract CN from issuer DN
        String issuerCN = extractCommonName(issuer);
        builder.issuer(issuerCN);

        // Subject
        String subject = cert.getSubjectDN().getName();
        String subjectCN = extractCommonName(subject);
        builder.subject(subjectCN);

        // Validity dates
        LocalDate validFrom = cert.getNotBefore().toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();
        LocalDate validUntil = cert.getNotAfter().toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();

        builder
                .validFrom(validFrom)
                .validUntil(validUntil);

        // Calculate days until expiry
        LocalDate now = LocalDate.now();
        long daysUntilExpiry = ChronoUnit.DAYS.between(now, validUntil);
        builder
                .daysUntilExpiry(daysUntilExpiry)
                .expired(daysUntilExpiry < 0);

        // Serial number
        builder.serialNumber(cert.getSerialNumber().toString(16).toUpperCase());

        // Subject Alternative Names (SANs)
        try {
            Collection<List<?>> sans = cert.getSubjectAlternativeNames();
            if (sans != null) {
                List<String> sanList = new ArrayList<>();
                for (List<?> san : sans) {
                    if (san.size() >= 2 && san.get(1) instanceof String) {
                        sanList.add((String) san.get(1));
                    }
                }
                if (!sanList.isEmpty()) {
                    builder.subjectAlternativeNames(sanList.toArray(new String[0]));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract SANs: {}", e.getMessage());
        }
    }

    /**
     * Extracts Common Name (CN) from Distinguished Name
     */
    private String extractCommonName(String dn) {
        String[] parts = dn.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.startsWith("CN=")) {
                return trimmed.substring(3);
            }
        }
        return dn;
    }
}
