package tech.wintrich.networkapi.presentation.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for NetworkController
 */
@SpringBootTest
@AutoConfigureMockMvc
class NetworkControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void ping_ValidHost_ShouldReturn200() throws Exception {
        mockMvc.perform(get("/api/network/ping")
                        .param("host", "google.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.host").value("google.com"))
                .andExpect(jsonPath("$.ip").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void ping_InvalidHost_ShouldReturnErrorInResponse() throws Exception {
        mockMvc.perform(get("/api/network/ping")
                        .param("host", "invalid-domain-xyz-123.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reachable").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void ping_LocalhostHost_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/network/ping")
                        .param("host", "localhost"))
                .andExpect(status().isForbidden());
    }

    @Test
    void dns_ValidDomain_ShouldReturn200() throws Exception {
        mockMvc.perform(get("/api/network/dns")
                        .param("domain", "google.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.domain").value("google.com"))
                .andExpect(jsonPath("$.aRecords").isArray());
    }

    @Test
    void httpAnalysis_ValidUrl_ShouldReturn200() throws Exception {
        mockMvc.perform(get("/api/network/http-analysis")
                        .param("url", "https://example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://example.com"))
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    void tlsInfo_ValidHost_ShouldReturn200() throws Exception {
        mockMvc.perform(get("/api/network/tls-info")
                        .param("host", "google.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.host").value("google.com"))
                .andExpect(jsonPath("$.protocol").exists());
    }

    @Test
    void ping_MissingParameter_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/network/ping"))
                .andExpect(status().isBadRequest());
    }
}
