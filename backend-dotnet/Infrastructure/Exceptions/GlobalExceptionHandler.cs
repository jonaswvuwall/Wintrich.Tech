using Microsoft.AspNetCore.Diagnostics;
using Wintrich.NetworkApi.Infrastructure.Exceptions;

namespace Wintrich.NetworkApi.Infrastructure.Exceptions;

/// <summary>
/// Global exception handler — equivalent to Spring's @RestControllerAdvice.
/// Maps known exception types to structured JSON error responses.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, error, message) = exception switch
        {
            NetworkSecurityException ex => (StatusCodes.Status403Forbidden, "Security Error", ex.Message),
            ArgumentException ex => (StatusCodes.Status400BadRequest, "Invalid Parameter", ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error",
                  "An unexpected error occurred. Please try again later.")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unexpected error");
        else
            logger.LogWarning("{Error}: {Message}", error, message);

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        await httpContext.Response.WriteAsJsonAsync(new
        {
            timestamp = DateTime.UtcNow,
            status = statusCode,
            error,
            message
        }, cancellationToken);

        return true;
    }
}
