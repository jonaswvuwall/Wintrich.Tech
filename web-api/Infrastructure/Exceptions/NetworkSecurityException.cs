namespace Wintrich.NetworkApi.Infrastructure.Exceptions;

/// <summary>
/// Thrown when an incoming request violates security constraints (SSRF, blocked hosts, etc.).
/// Maps to HTTP 403 Forbidden.
/// </summary>
public sealed class NetworkSecurityException : Exception
{
    public NetworkSecurityException(string message) : base(message) { }
}
