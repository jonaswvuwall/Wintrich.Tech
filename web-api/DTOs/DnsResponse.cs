namespace Wintrich.NetworkApi.DTOs;

public record DnsResponse(
    string Domain,
    List<string> ARecords,
    List<string> AaaaRecords,
    List<string> MxRecords,
    List<string> NsRecords,
    List<string> TxtRecords,
    long? Ttl,
    string? Error
);
