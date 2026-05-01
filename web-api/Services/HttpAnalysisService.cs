using Wintrich.NetworkApi.DTOs;

namespace Wintrich.NetworkApi.Services;

/// <summary>
/// HTTP analysis service using IHttpClientFactory.
/// Equivalent of the Java HttpAnalysisService (measures response time, captures headers, redirects).
/// </summary>
public sealed class HttpAnalysisService(
    IHttpClientFactory httpClientFactory,
    ILogger<HttpAnalysisService> logger)
{
    public async Task<HttpAnalysisResponse> AnalyzeAsync(string url)
    {
        logger.LogDebug("Performing HTTP analysis for URL: {Url}", url);

        int? status = null;
        string? statusText = null;
        long? responseTimeMs = null;
        string? contentType = null;
        string? server = null;
        Dictionary<string, string>? headers = null;
        string[]? redirectChain = null;
        string? finalUrl = null;
        long? contentLength = null;
        string? error = null;

        try
        {
            var client = httpClientFactory.CreateClient("analysis");

            var sw = System.Diagnostics.Stopwatch.StartNew();
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseContentRead);
            sw.Stop();

            responseTimeMs = sw.ElapsedMilliseconds;
            status = (int)response.StatusCode;
            statusText = GetStatusText(status.Value);
            finalUrl = response.RequestMessage?.RequestUri?.ToString() ?? url;

            // Collect all response headers (flatten multi-value headers with ", ")
            headers = response.Headers
                .Concat(response.Content.Headers)
                .ToDictionary(
                    h => h.Key.ToLowerInvariant(),
                    h => string.Join(", ", h.Value),
                    StringComparer.OrdinalIgnoreCase);

            contentType = response.Content.Headers.ContentType?.ToString();
            server = response.Headers.Server?.ToString();

            // Content length: header first, then actual body length as fallback
            contentLength = response.Content.Headers.ContentLength;
            if (contentLength == null)
            {
                var body = await response.Content.ReadAsByteArrayAsync();
                contentLength = body.LongLength;
            }

            // Redirect chain: if the final URL differs from the original
            if (!string.Equals(finalUrl, url, StringComparison.OrdinalIgnoreCase))
                redirectChain = new[] { url, finalUrl };
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "HTTP request failed for URL: {Url}", url);
            error = $"HTTP request failed: {ex.Message}";
        }
        catch (TaskCanceledException ex)
        {
            logger.LogError(ex, "HTTP request timed out for URL: {Url}", url);
            error = "Request timed out";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during HTTP analysis for URL: {Url}", url);
            error = $"Analysis failed: {ex.Message}";
        }

        return new HttpAnalysisResponse(
            url, status, statusText, responseTimeMs,
            contentType, server, headers, redirectChain, finalUrl, contentLength, error);
    }

    private static string GetStatusText(int statusCode) => statusCode switch
    {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => $"HTTP {statusCode}"
    };
}
