package tech.wintrich.networkapi.application.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.wintrich.networkapi.presentation.dto.PingResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for ConnectivityService
 */
@ExtendWith(MockitoExtension.class)
class ConnectivityServiceTest {

    @InjectMocks
    private ConnectivityService connectivityService;

    @Test
    void ping_ValidHost_ShouldReturnReachableResponse() {
        // Given
        String host = "google.com";

        // When
        PingResponse response = connectivityService.ping(host);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getHost()).isEqualTo(host);
        assertThat(response.getIp()).isNotNull();
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    void ping_InvalidHost_ShouldReturnError() {
        // Given
        String host = "this-domain-definitely-does-not-exist-12345.com";

        // When
        PingResponse response = connectivityService.ping(host);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.isReachable()).isFalse();
        assertThat(response.getError()).isNotNull();
    }
}
