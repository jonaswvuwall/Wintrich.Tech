package tech.wintrich.networkapi.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.xbill.DNS.*;
import tech.wintrich.networkapi.presentation.dto.DnsResponse;

import java.util.ArrayList;
import java.util.List;

/**
 * Service for DNS lookups and intelligence
 */
@Slf4j
@Service
public class DnsService {

    /**
     * Performs comprehensive DNS lookup for a domain
     *
     * @param domain the target domain
     * @return DnsResponse with DNS records
     */
    @Cacheable(value = "dns", key = "#domain")
    public DnsResponse lookup(String domain) {
        log.debug("Performing DNS lookup for domain: {}", domain);

        DnsResponse.DnsResponseBuilder responseBuilder = DnsResponse.builder()
                .domain(domain);

        try {
            // A Records (IPv4)
            List<String> aRecords = lookupRecords(domain, Type.A);
            responseBuilder.aRecords(aRecords);

            // AAAA Records (IPv6)
            List<String> aaaaRecords = lookupRecords(domain, Type.AAAA);
            responseBuilder.aaaaRecords(aaaaRecords);

            // MX Records (Mail Exchange)
            List<String> mxRecords = lookupMXRecords(domain);
            responseBuilder.mxRecords(mxRecords);

            // NS Records (Name Servers)
            List<String> nsRecords = lookupRecords(domain, Type.NS);
            responseBuilder.nsRecords(nsRecords);

            // TXT Records
            List<String> txtRecords = lookupRecords(domain, Type.TXT);
            responseBuilder.txtRecords(txtRecords);

            // Get TTL from A record if available
            if (!aRecords.isEmpty()) {
                Long ttl = getTTL(domain, Type.A);
                responseBuilder.ttl(ttl);
            }

        } catch (Exception e) {
            log.error("DNS lookup failed for domain: {}", domain, e);
            responseBuilder.error("DNS lookup failed: " + e.getMessage());
        }

        return responseBuilder.build();
    }

    /**
     * Looks up DNS records of a specific type
     */
    private List<String> lookupRecords(String domain, int type) {
        List<String> records = new ArrayList<>();
        try {
            Lookup lookup = new Lookup(domain, type);
            lookup.run();
            
            if (lookup.getResult() == Lookup.SUCCESSFUL) {
                Record[] queryRecords = lookup.getAnswers();
                if (queryRecords != null) {
                    for (Record record : queryRecords) {
                        records.add(extractRecordData(record));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to lookup {} records for {}: {}", Type.string(type), domain, e.getMessage());
        }
        return records;
    }

    /**
     * Looks up MX records with priority
     */
    private List<String> lookupMXRecords(String domain) {
        List<String> mxRecords = new ArrayList<>();
        try {
            Lookup lookup = new Lookup(domain, Type.MX);
            lookup.run();
            
            if (lookup.getResult() == Lookup.SUCCESSFUL) {
                Record[] records = lookup.getAnswers();
                if (records != null) {
                    for (Record record : records) {
                        if (record instanceof MXRecord) {
                            MXRecord mx = (MXRecord) record;
                            mxRecords.add(mx.getPriority() + " " + mx.getTarget());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to lookup MX records for {}: {}", domain, e.getMessage());
        }
        return mxRecords;
    }

    /**
     * Gets the TTL for a specific record type
     */
    private Long getTTL(String domain, int type) {
        try {
            Lookup lookup = new Lookup(domain, type);
            lookup.run();
            
            if (lookup.getResult() == Lookup.SUCCESSFUL) {
                Record[] records = lookup.getAnswers();
                if (records != null && records.length > 0) {
                    return records[0].getTTL();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get TTL for {}: {}", domain, e.getMessage());
        }
        return null;
    }

    /**
     * Extracts data from a DNS record
     */
    private String extractRecordData(Record record) {
        if (record instanceof ARecord) {
            return ((ARecord) record).getAddress().getHostAddress();
        } else if (record instanceof AAAARecord) {
            return ((AAAARecord) record).getAddress().getHostAddress();
        } else if (record instanceof NSRecord) {
            return ((NSRecord) record).getTarget().toString();
        } else if (record instanceof TXTRecord) {
            return String.join(" ", ((TXTRecord) record).getStrings());
        } else {
            return record.rdataToString();
        }
    }
}
