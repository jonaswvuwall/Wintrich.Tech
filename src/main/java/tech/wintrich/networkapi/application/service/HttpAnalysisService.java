package tech.wintrich.networkapi.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tech.wintrich.networkapi.presentation.dto.HttpAnalysisResponse;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for HTTP analysis and performance testing
 */
@Slf4j
@Service
public class HttpAnalysisService {

    @Value("${api.network.timeout.http:10000}")
    private int httpTimeout;

    private final HttpClient httpClient;

    public HttpAnalysisService() {
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Performs comprehensive HTTP analysis of a URL
     *
     * @param url the target URL
     * @return HttpAnalysisResponse with performance and header data
     */
    public HttpAnalysisResponse analyze(String url) {
        log.debug("Performing HTTP analysis for URL: {}", url);

        HttpAnalysisResponse.HttpAnalysisResponseBuilder responseBuilder = 
                HttpAnalysisResponse.builder().url(url);

        try {
            // Build request with timeout
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(httpTimeout))
                    .GET()
                    .build();

            // Measure response time
            long startTime = System.nanoTime();
            HttpResponse<String> response = httpClient.send(request, 
                    HttpResponse.BodyHandlers.ofString());
            long responseTime = (System.nanoTime() - startTime) / 1_000_000;

            // Extract response data
            responseBuilder
                    .status(response.statusCode())
                    .statusText(getStatusText(response.statusCode()))
                    .responseTimeMs(responseTime)
                    .finalUrl(response.uri().toString());

            // Process headers
            Map<String, String> headers = response.headers().map().entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> String.join(", ", e.getValue())
                    ));

            responseBuilder.headers(headers);

            // Extract specific headers
            response.headers().firstValue("content-type")
                    .ifPresent(responseBuilder::contentType);

            response.headers().firstValue("server")
                    .ifPresent(responseBuilder::server);

            response.headers().firstValue("content-length")
                    .ifPresent(length -> responseBuilder.contentLength(Long.parseLong(length)));

            // Check for redirects
            if (!response.uri().toString().equals(url)) {
                responseBuilder.redirectChain(new String[]{url, response.uri().toString()});
            }

            // If no content-length header, use body length
            if (responseBuilder.build().getContentLength() == null) {
                responseBuilder.contentLength((long) response.body().length());
            }

        } catch (IOException e) {
            log.error("HTTP request failed for URL: {}", url, e);
            responseBuilder.error("HTTP request failed: " + e.getMessage());
        } catch (InterruptedException e) {
            log.error("HTTP request interrupted for URL: {}", url, e);
            Thread.currentThread().interrupt();
            responseBuilder.error("Request interrupted");
        } catch (Exception e) {
            log.error("Unexpected error during HTTP analysis: {}", url, e);
            responseBuilder.error("Analysis failed: " + e.getMessage());
        }

        return responseBuilder.build();
    }

    /**
     * Converts HTTP status code to text
     */
    private String getStatusText(int statusCode) {
        return switch (statusCode) {
            case 200 -> "OK";
            case 201 -> "Created";
            case 204 -> "No Content";
            case 301 -> "Moved Permanently";
            case 302 -> "Found";
            case 304 -> "Not Modified";
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 403 -> "Forbidden";
            case 404 -> "Not Found";
            case 500 -> "Internal Server Error";
            case 502 -> "Bad Gateway";
            case 503 -> "Service Unavailable";
            case 504 -> "Gateway Timeout";
            default -> "HTTP " + statusCode;
        };
    }
}
