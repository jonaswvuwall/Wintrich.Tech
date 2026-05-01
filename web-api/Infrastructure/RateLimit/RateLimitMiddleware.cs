using System.Collections.Concurrent;
using System.Text.Json;

namespace Wintrich.NetworkApi.Infrastructure.RateLimit;

/// <summary>
/// Token-bucket rate limiting middleware — equivalent to the Java Bucket4j-based interceptor.
/// Limits requests per client IP. Convention-based middleware; instantiated once at startup.
/// </summary>
public sealed class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _enabled;
    private readonly int _capacity;
    private readonly int _refillTokens;
    private readonly ILogger<RateLimitMiddleware> _logger;
    private readonly ConcurrentDictionary<string, TokenBucket> _buckets = new();

    public RateLimitMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        ILogger<RateLimitMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _enabled = configuration.GetValue<bool>("Api:Network:RateLimit:Enabled", true);
        _capacity = configuration.GetValue<int>("Api:Network:RateLimit:Capacity", 100);
        _refillTokens = configuration.GetValue<int>("Api:Network:RateLimit:RefillTokens", 100);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_enabled || !context.Request.Path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        var key = GetClientKey(context.Request);
        var bucket = _buckets.GetOrAdd(key, _ => new TokenBucket(_capacity, _refillTokens));

        if (bucket.TryConsume())
        {
            context.Response.Headers["X-Rate-Limit-Remaining"] = bucket.Available.ToString();
            await _next(context);
        }
        else
        {
            _logger.LogWarning("Rate limit exceeded for client: {Key}", key);
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "Rate limit exceeded",
                message = "Too many requests. Please try again later."
            }));
        }
    }

    private static string GetClientKey(HttpRequest request)
    {
        var forwarded = request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return "rl:" + forwarded.Split(',')[0].Trim();

        var realIp = request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp))
            return "rl:" + realIp;

        return "rl:" + (request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
    }
}

/// <summary>Thread-safe token bucket used by <see cref="RateLimitMiddleware"/>.</summary>
internal sealed class TokenBucket
{
    private double _tokens;
    private DateTime _lastRefill;
    private readonly double _capacity;
    private readonly double _refillTokens;
    private readonly object _lock = new();

    public TokenBucket(double capacity, double refillTokens)
    {
        _capacity = capacity;
        _refillTokens = refillTokens;
        _tokens = capacity;
        _lastRefill = DateTime.UtcNow;
    }

    public bool TryConsume()
    {
        lock (_lock)
        {
            Refill();
            if (_tokens >= 1)
            {
                _tokens--;
                return true;
            }
            return false;
        }
    }

    public long Available
    {
        get
        {
            lock (_lock)
            {
                Refill();
                return (long)_tokens;
            }
        }
    }

    private void Refill()
    {
        var now = DateTime.UtcNow;
        var tokensToAdd = (now - _lastRefill).TotalMinutes * _refillTokens;
        _tokens = Math.Min(_capacity, _tokens + tokensToAdd);
        _lastRefill = now;
    }
}
