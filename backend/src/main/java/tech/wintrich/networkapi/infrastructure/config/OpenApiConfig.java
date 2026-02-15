package tech.wintrich.networkapi.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI/Swagger documentation configuration
 */
@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Network Intelligence API")
                        .description("""
                                A developer-focused API for analyzing connectivity, DNS, HTTP, and TLS characteristics of hosts and URLs.
                                
                                **Perfect for:**
                                - DevOps & SRE tooling
                                - Network debugging
                                - Monitoring and alerting
                                - Security auditing
                                
                                **Features:**
                                - Real-time connectivity checks with latency measurement
                                - Comprehensive DNS record lookups
                                - HTTP performance analysis
                                - TLS/SSL certificate inspection
                                - Built-in rate limiting and security
                                - Response caching for performance
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Wintrich Tech")
                                .url("https://wintrich.tech")
                                .email("contact@wintrich.tech"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort)
                                .description("Local Development Server"),
                        new Server()
                                .url("https://api.wintrich.tech")
                                .description("Production Server")
                ));
    }
}
