package tech.wintrich.networkapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Network Intelligence API - Main Application
 * 
 * A developer-focused API for analyzing connectivity, DNS, HTTP, and TLS characteristics.
 * 
 * @author Wintrich Tech
 * @version 1.0.0
 */
@SpringBootApplication
@EnableCaching
public class NetworkIntelligenceApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(NetworkIntelligenceApiApplication.class, args);
    }
}
