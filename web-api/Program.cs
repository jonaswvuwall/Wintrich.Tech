using System.Text.Json;
using System.Text.Json.Serialization;
using Wintrich.NetworkApi.Infrastructure.Exceptions;
using Wintrich.NetworkApi.Infrastructure.RateLimit;
using Wintrich.NetworkApi.Infrastructure.Security;
using Wintrich.NetworkApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ─────────────────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────────────────

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Match Java/Jackson camelCase serialization (host, latencyMs, aRecords…)
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        // Match Java/Jackson: skip null fields (optional properties absent on error-free responses)
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Wintrich.Tech — Network Intelligence API",
        Version = "v1",
        Description = "Developer-focused API for analysing connectivity, DNS, HTTP and TLS. " +
                      "Direct C# port of the Spring Boot backend."
    });
});

// Memory cache (replaces Caffeine; used by DnsService and TlsService)
builder.Services.AddMemoryCache();

// CORS — allow all origins (matches @CrossOrigin(origins = "*") on the Java controller)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
            .SetPreflightMaxAge(TimeSpan.FromHours(1)));
});

// Named HttpClient for HttpAnalysisService
var httpTimeout = builder.Configuration.GetValue<int>("Api:Network:Timeout:Http", 10000);
builder.Services.AddHttpClient("analysis", client =>
{
    client.Timeout = TimeSpan.FromMilliseconds(httpTimeout);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Wintrich.Tech/1.0 NetworkIntelligence");
})
.ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    AllowAutoRedirect = true,
    MaxAutomaticRedirections = 10,
    // Follow redirects and measure total time (matches Java HttpClient.Redirect.NORMAL)
});

// Exception handler (maps NetworkSecurityException→403, ArgumentException→400)
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Application services
builder.Services.AddSingleton<UrlValidator>();
builder.Services.AddScoped<ConnectivityService>();
builder.Services.AddScoped<DnsService>();
builder.Services.AddScoped<HttpAnalysisService>();
builder.Services.AddScoped<TlsService>();
builder.Services.AddScoped<SecurityHeadersService>();

// ─────────────────────────────────────────────────────────────────────────────
// Port binding — reads PORT env var (Render/Railway) or defaults to 8080
// ─────────────────────────────────────────────────────────────────────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ─────────────────────────────────────────────────────────────────────────────
// Middleware pipeline
// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseExceptionHandler(); // delegates to GlobalExceptionHandler

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Network Intelligence API v1");
    c.RoutePrefix = "swagger"; // /swagger → Swagger UI  (same as Spring's /swagger-ui.html)
    c.DocumentTitle = "Wintrich.Tech API";
});

app.UseCors();

// Rate limiting middleware (convention-based; instantiated once at startup, acts as singleton)
app.UseMiddleware<RateLimitMiddleware>();

app.MapControllers();

// Health check endpoint — mirrors Spring Actuator's /actuator/health
app.MapGet("/actuator/health", () => Results.Ok(new { status = "UP" }));

app.Run();
