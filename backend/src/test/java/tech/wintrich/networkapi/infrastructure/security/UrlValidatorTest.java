package tech.wintrich.networkapi.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Unit tests for UrlValidator security checks
 */
@ExtendWith(MockitoExtension.class)
class UrlValidatorTest {

    private UrlValidator urlValidator;

    @BeforeEach
    void setUp() {
        urlValidator = new UrlValidator();
        ReflectionTestUtils.setField(urlValidator, "blockInternalIps", true);
        ReflectionTestUtils.setField(urlValidator, "blockedHosts", List.of("localhost", "127.0.0.1"));
    }

    @Test
    void validateUrl_ValidHttpsUrl_ShouldPass() {
        assertDoesNotThrow(() -> urlValidator.validateUrl("https://example.com"));
    }

    @Test
    void validateUrl_ValidHttpUrl_ShouldPass() {
        assertDoesNotThrow(() -> urlValidator.validateUrl("http://example.com"));
    }

    @Test
    void validateUrl_LocalhostUrl_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateUrl("http://localhost:8080"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("localhost");
    }

    @Test
    void validateUrl_InternalIpUrl_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateUrl("http://192.168.1.1"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void validateUrl_FileProtocol_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateUrl("file:///etc/passwd"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("HTTP");
    }

    @Test
    void validateHost_ValidDomain_ShouldPass() {
        assertDoesNotThrow(() -> urlValidator.validateHost("example.com"));
    }

    @Test
    void validateHost_ValidPublicIp_ShouldPass() {
        assertDoesNotThrow(() -> urlValidator.validateHost("8.8.8.8"));
    }

    @Test
    void validateHost_Localhost_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateHost("localhost"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void validateHost_LoopbackIp_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateHost("127.0.0.1"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void validateHost_EmptyHost_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateHost(""))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void validateHost_InvalidFormat_ShouldThrowSecurityException() {
        assertThatThrownBy(() -> urlValidator.validateHost("not a valid host!!!"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Invalid host format");
    }
}
