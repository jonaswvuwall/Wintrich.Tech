/**
 * Interpretation utilities to help users understand network data
 */

export interface Interpretation {
  meaning: string;
  context?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

// ===== PING INTERPRETATIONS =====

export const interpretLatency = (latencyMs: number): Interpretation => {
  if (latencyMs < 20) {
    return {
      meaning: 'Excellent connection',
      context: 'Very low latency - ideal for gaming, video calls, and real-time applications.',
      severity: 'success',
    };
  } else if (latencyMs < 50) {
    return {
      meaning: 'Good connection',
      context: 'Low latency - suitable for most online activities including streaming and browsing.',
      severity: 'success',
    };
  } else if (latencyMs < 100) {
    return {
      meaning: 'Acceptable connection',
      context: 'Moderate latency - fine for browsing and streaming, may notice delays in gaming.',
      severity: 'info',
    };
  } else if (latencyMs < 200) {
    return {
      meaning: 'Slow connection',
      context: 'High latency - expect noticeable delays in interactive applications.',
      severity: 'warning',
    };
  } else {
    return {
      meaning: 'Very slow connection',
      context: 'Very high latency - significant delays expected, poor for real-time applications.',
      severity: 'error',
    };
  }
};

export const interpretReachability = (reachable: boolean, host: string): Interpretation => {
  if (reachable) {
    return {
      meaning: 'Host is online and responding',
      context: `${host} is accessible and responding to network requests.`,
      severity: 'success',
    };
  } else {
    return {
      meaning: 'Host is unreachable',
      context: 'The host may be offline, behind a firewall, or the address is incorrect.',
      severity: 'error',
    };
  }
};

// ===== DNS INTERPRETATIONS =====

export const interpretTTL = (ttl: number): Interpretation => {
  if (ttl < 300) {
    return {
      meaning: 'Short cache time',
      context: 'DNS records expire quickly. Useful for services that change IPs frequently.',
      severity: 'info',
    };
  } else if (ttl < 3600) {
    return {
      meaning: 'Standard cache time',
      context: 'Normal TTL value. Records are cached for a moderate duration.',
      severity: 'success',
    };
  } else if (ttl < 86400) {
    return {
      meaning: 'Long cache time',
      context: 'Records are cached for hours. Reduces DNS queries but slower to update.',
      severity: 'info',
    };
  } else {
    return {
      meaning: 'Very long cache time',
      context: 'Records cached for a day or more. Changes to DNS take longer to propagate.',
      severity: 'info',
    };
  }
};

export const interpretDnsRecordType = (type: string): Interpretation => {
  const explanations: Record<string, Interpretation> = {
    A: {
      meaning: 'IPv4 Address Record',
      context: 'Maps a domain name to a 32-bit IPv4 address (e.g., 192.168.1.1).',
      severity: 'info',
    },
    AAAA: {
      meaning: 'IPv6 Address Record',
      context: 'Maps a domain name to a 128-bit IPv6 address for modern networks.',
      severity: 'info',
    },
    MX: {
      meaning: 'Mail Exchange Record',
      context: 'Specifies mail servers responsible for handling email for this domain.',
      severity: 'info',
    },
    NS: {
      meaning: 'Name Server Record',
      context: 'Indicates which DNS servers are authoritative for this domain.',
      severity: 'info',
    },
    TXT: {
      meaning: 'Text Record',
      context: 'Contains text information for various purposes like email verification and security policies.',
      severity: 'info',
    },
  };
  return explanations[type] || { meaning: 'DNS record', context: 'Domain Name System record.', severity: 'info' };
};

// ===== HTTP INTERPRETATIONS =====

export const interpretStatusCode = (code: number): Interpretation => {
  if (code >= 200 && code < 300) {
    return {
      meaning: 'Success',
      context: getStatusCodeMeaning(code),
      severity: 'success',
    };
  } else if (code >= 300 && code < 400) {
    return {
      meaning: 'Redirection',
      context: getStatusCodeMeaning(code),
      severity: 'info',
    };
  } else if (code >= 400 && code < 500) {
    return {
      meaning: 'Client Error',
      context: getStatusCodeMeaning(code),
      severity: 'warning',
    };
  } else if (code >= 500 && code < 600) {
    return {
      meaning: 'Server Error',
      context: getStatusCodeMeaning(code),
      severity: 'error',
    };
  }
  return {
    meaning: 'Unknown status',
    context: 'Non-standard HTTP status code.',
    severity: 'info',
  };
};

const getStatusCodeMeaning = (code: number): string => {
  const meanings: Record<number, string> = {
    200: 'OK - The request succeeded.',
    201: 'Created - A new resource was successfully created.',
    204: 'No Content - Request succeeded but no content to return.',
    301: 'Moved Permanently - Resource has been moved to a new URL.',
    302: 'Found - Temporary redirect to another URL.',
    304: 'Not Modified - Cached version can be used.',
    400: 'Bad Request - Server cannot process the request due to client error.',
    401: 'Unauthorized - Authentication is required.',
    403: 'Forbidden - Server refuses to fulfill the request.',
    404: 'Not Found - The requested resource does not exist.',
    429: 'Too Many Requests - Rate limit exceeded.',
    500: 'Internal Server Error - Server encountered an unexpected condition.',
    502: 'Bad Gateway - Server received invalid response from upstream server.',
    503: 'Service Unavailable - Server is temporarily unable to handle the request.',
  };
  return meanings[code] || `HTTP status code ${code}.`;
};

export const interpretResponseTime = (timeMs: number): Interpretation => {
  if (timeMs < 100) {
    return {
      meaning: 'Very fast response',
      context: 'Server responded quickly - excellent performance.',
      severity: 'success',
    };
  } else if (timeMs < 300) {
    return {
      meaning: 'Fast response',
      context: 'Good server response time for most web applications.',
      severity: 'success',
    };
  } else if (timeMs < 1000) {
    return {
      meaning: 'Acceptable response',
      context: 'Response time is acceptable but could be improved.',
      severity: 'info',
    };
  } else if (timeMs < 3000) {
    return {
      meaning: 'Slow response',
      context: 'Server took longer than ideal - may affect user experience.',
      severity: 'warning',
    };
  } else {
    return {
      meaning: 'Very slow response',
      context: 'Significantly delayed response - poor server performance or network issues.',
      severity: 'error',
    };
  }
};

export const interpretContentType = (contentType: string): Interpretation => {
  const type = contentType.toLowerCase();
  
  if (type.includes('html')) {
    return {
      meaning: 'HTML Document',
      context: 'Web page content that browsers can render.',
      severity: 'info',
    };
  } else if (type.includes('json')) {
    return {
      meaning: 'JSON Data',
      context: 'Structured data format commonly used for APIs.',
      severity: 'info',
    };
  } else if (type.includes('xml')) {
    return {
      meaning: 'XML Data',
      context: 'Structured markup language for data exchange.',
      severity: 'info',
    };
  } else if (type.includes('javascript')) {
    return {
      meaning: 'JavaScript Code',
      context: 'Client-side script that runs in the browser.',
      severity: 'info',
    };
  } else if (type.includes('css')) {
    return {
      meaning: 'Stylesheet',
      context: 'Styling information for web pages.',
      severity: 'info',
    };
  } else if (type.includes('image')) {
    return {
      meaning: 'Image File',
      context: 'Visual content in various formats (JPEG, PNG, etc.).',
      severity: 'info',
    };
  } else if (type.includes('text')) {
    return {
      meaning: 'Plain Text',
      context: 'Unformatted text content.',
      severity: 'info',
    };
  }
  
  return {
    meaning: 'Binary or Other Content',
    context: contentType || 'Content type not specified.',
    severity: 'info',
  };
};

// ===== TLS/SSL INTERPRETATIONS =====

export const interpretCertificateExpiry = (daysUntilExpiry: number): Interpretation => {
  if (daysUntilExpiry < 0) {
    return {
      meaning: 'Certificate EXPIRED',
      context: 'This certificate has expired and is no longer valid. Connections are insecure!',
      severity: 'error',
    };
  } else if (daysUntilExpiry < 7) {
    return {
      meaning: 'Critical - Expiring soon',
      context: 'Certificate expires in less than a week. Immediate renewal required!',
      severity: 'error',
    };
  } else if (daysUntilExpiry < 30) {
    return {
      meaning: 'Warning - Renew soon',
      context: 'Certificate expires within a month. Plan for renewal to avoid service disruption.',
      severity: 'warning',
    };
  } else if (daysUntilExpiry < 90) {
    return {
      meaning: 'Valid - Monitor renewal',
      context: 'Certificate is valid but consider monitoring for upcoming renewal.',
      severity: 'success',
    };
  } else {
    return {
      meaning: 'Valid and up-to-date',
      context: 'Certificate is valid with plenty of time before expiration.',
      severity: 'success',
    };
  }
};

export const interpretSignatureAlgorithm = (algorithm: string): Interpretation => {
  const alg = algorithm.toLowerCase();
  
  if (alg.includes('sha256') || alg.includes('sha384') || alg.includes('sha512')) {
    return {
      meaning: 'Strong algorithm',
      context: 'Modern, secure cryptographic signature algorithm.',
      severity: 'success',
    };
  } else if (alg.includes('sha1')) {
    return {
      meaning: 'Weak algorithm',
      context: 'SHA-1 is deprecated and considered insecure. Upgrade recommended.',
      severity: 'warning',
    };
  } else if (alg.includes('md5')) {
    return {
      meaning: 'Insecure algorithm',
      context: 'MD5 is cryptographically broken. This certificate is not secure!',
      severity: 'error',
    };
  }
  
  return {
    meaning: 'Certificate signature',
    context: algorithm,
    severity: 'info',
  };
};

export const interpretTlsVersion = (version: number): Interpretation => {
  if (version === 3) {
    return {
      meaning: 'TLS 1.2 or higher',
      context: 'Modern, secure TLS version. Good security standard.',
      severity: 'success',
    };
  } else if (version === 2) {
    return {
      meaning: 'TLS 1.1 or lower',
      context: 'Older protocol version. Consider upgrading to TLS 1.2 or higher.',
      severity: 'warning',
    };
  } else if (version === 1) {
    return {
      meaning: 'SSL 3.0',
      context: 'Deprecated and insecure. Should not be used!',
      severity: 'error',
    };
  }
  
  return {
    meaning: `Certificate version ${version}`,
    context: 'X.509 certificate version.',
    severity: 'info',
  };
};

export const interpretSAN = (count: number): Interpretation => {
  if (count === 0) {
    return {
      meaning: 'No alternative names',
      context: 'Certificate is only valid for the primary domain.',
      severity: 'info',
    };
  } else if (count === 1) {
    return {
      meaning: 'One alternative name',
      context: 'Certificate covers one additional domain or subdomain.',
      severity: 'info',
    };
  } else {
    return {
      meaning: 'Multiple alternative names',
      context: `Certificate covers ${count} different domains or subdomains (wildcard or multi-domain cert).`,
      severity: 'info',
    };
  }
};

// ===== GENERAL INTERPRETATIONS =====

export const interpretIPv4 = (ip: string): Interpretation => {
  const parts = ip.split('.');
  const firstOctet = parseInt(parts[0]);
  
  if (firstOctet === 127) {
    return {
      meaning: 'Localhost/Loopback',
      context: 'This IP refers to the local computer itself (127.0.0.1).',
      severity: 'info',
    };
  } else if (firstOctet === 10 || (firstOctet === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) || (firstOctet === 192 && parseInt(parts[1]) === 168)) {
    return {
      meaning: 'Private/Internal IP',
      context: 'This is a private network address, not accessible from the internet.',
      severity: 'info',
    };
  } else if (firstOctet === 0) {
    return {
      meaning: 'Invalid IP',
      context: 'This IP address is not valid for normal use.',
      severity: 'warning',
    };
  } else {
    return {
      meaning: 'Public IP Address',
      context: 'This is a public internet address that can be accessed globally.',
      severity: 'info',
    };
  }
};

export const interpretHeaders = (headerCount: number): Interpretation => {
  if (headerCount < 5) {
    return {
      meaning: 'Minimal headers',
      context: 'Few HTTP headers - may lack security features or optimizations.',
      severity: 'info',
    };
  } else if (headerCount < 15) {
    return {
      meaning: 'Standard headers',
      context: 'Normal amount of HTTP headers for a web response.',
      severity: 'success',
    };
  } else {
    return {
      meaning: 'Many headers',
      context: 'Large number of headers - may include extensive security policies and metadata.',
      severity: 'info',
    };
  }
};

// ===== OVERALL RESULT INTERPRETATIONS =====

export interface OverallInterpretation {
  title: string;
  summary: string;
  details: string[];
  severity: 'info' | 'success' | 'warning' | 'error';
}

export const interpretPingResult = (result: {
  host: string;
  ip: string | null;
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
}): OverallInterpretation => {
  if (result.error) {
    return {
      title: 'Connection Failed',
      summary: `Unable to reach ${result.host}. The host may be offline, blocking ping requests, or the address is invalid.`,
      details: [
        'Common causes: Firewall blocking ICMP packets, host offline, incorrect address',
        'Try: Verify the host address, check if it responds to other requests (HTTP)',
        'Note: Some servers intentionally block ping for security reasons',
      ],
      severity: 'error',
    };
  }

  if (!result.reachable) {
    return {
      title: 'Host Unreachable',
      summary: `${result.host} is not responding to ping requests. This could indicate the host is down or configured to ignore pings.`,
      details: [
        'The host might be online but configured to not respond to ICMP packets',
        'Network firewalls or security policies may be blocking the connection',
        'Try checking if the host responds via HTTP or other protocols',
      ],
      severity: 'warning',
    };
  }

  const latency = result.latencyMs || 0;
  let performanceAssessment = '';
  let recommendations: string[] = [];

  if (latency < 20) {
    performanceAssessment = `Excellent connection to ${result.host} with ${latency}ms latency. This is ideal for all online activities including gaming and real-time applications.`;
    recommendations = [
      'Perfect for: Online gaming, video conferencing, real-time collaboration',
      `Connected to ${result.ip} with minimal delay`,
      'Connection quality is optimal',
    ];
  } else if (latency < 50) {
    performanceAssessment = `Good connection to ${result.host} with ${latency}ms latency. Suitable for most online activities.`;
    recommendations = [
      'Good for: Streaming, browsing, video calls',
      `Connected to ${result.ip} with low latency`,
      'Connection is reliable for general use',
    ];
  } else if (latency < 100) {
    performanceAssessment = `Acceptable connection to ${result.host} with ${latency}ms latency. May notice slight delays in interactive applications.`;
    recommendations = [
      'Acceptable for: Web browsing, email, streaming',
      `Connected to ${result.ip} with moderate latency`,
      'Gaming or real-time apps may experience noticeable lag',
    ];
  } else if (latency < 200) {
    performanceAssessment = `Slow connection to ${result.host} with ${latency}ms latency. Expect noticeable delays in interactive applications.`;
    recommendations = [
      'Connection is slower than ideal',
      'Real-time applications will have significant lag',
      'Consider checking your network connection or choosing a closer server',
    ];
  } else {
    performanceAssessment = `Very slow connection to ${result.host} with ${latency}ms latency. This will significantly impact user experience.`;
    recommendations = [
      'High latency indicates network issues or distant server',
      'Real-time applications will be difficult to use',
      'Recommended: Check your internet connection or find an alternative server',
    ];
  }

  return {
    title: latency < 100 ? 'Connection Successful' : 'Connection Slow',
    summary: performanceAssessment,
    details: recommendations,
    severity: latency < 50 ? 'success' : latency < 100 ? 'info' : latency < 200 ? 'warning' : 'error',
  };
};

export const interpretDnsResult = (result: {
  domain: string;
  aRecords: string[];
  aaaaRecords: string[];
  mxRecords: string[];
  nsRecords: string[];
  txtRecords: string[];
  ttl: number | null;
  error: string | null;
}): OverallInterpretation => {
  try {
    if (result.error) {
      return {
        title: 'DNS Lookup Failed',
        summary: `Unable to resolve ${result.domain}. The domain may not exist or DNS servers are unavailable.`,
        details: [
          'Possible causes: Domain doesn\'t exist, typo in domain name, DNS server issues',
          'Try: Verify the domain spelling, check your DNS settings',
          'If the domain is new, it may still be propagating across DNS servers',
        ],
        severity: 'error',
      };
    }

    const totalRecords = (result.aRecords?.length || 0) + (result.aaaaRecords?.length || 0) + 
                        (result.mxRecords?.length || 0) + (result.nsRecords?.length || 0) + 
                        (result.txtRecords?.length || 0);

    if (totalRecords === 0) {
      return {
        title: 'No DNS Records Found',
        summary: `${result.domain} exists but has no DNS records configured. This domain is not properly set up.`,
        details: [
          'The domain exists but isn\'t pointing to any servers',
          'Website and email services won\'t work without proper DNS records',
          'Contact the domain administrator to configure DNS records',
        ],
        severity: 'warning',
      };
    }

    const details: string[] = [];
    let severity: 'success' | 'info' | 'warning' = 'success';

    if ((result.aRecords?.length || 0) > 0) {
      details.push(`✓ IPv4 configured: ${result.aRecords.length} A record${result.aRecords.length > 1 ? 's' : ''} found (${result.aRecords.join(', ')})`);
    } else {
      details.push('⚠ No IPv4 addresses configured');
      severity = 'warning';
    }

    if ((result.aaaaRecords?.length || 0) > 0) {
      details.push(`✓ IPv6 enabled: ${result.aaaaRecords.length} AAAA record${result.aaaaRecords.length > 1 ? 's' : ''} found (modern, future-proof)`);
    } else {
      details.push('○ No IPv6 configured (not critical but recommended for modern infrastructure)');
    }

    if ((result.mxRecords?.length || 0) > 0) {
      details.push(`✓ Email configured: ${result.mxRecords.length} mail server${result.mxRecords.length > 1 ? 's' : ''} found`);
    }

    if ((result.nsRecords?.length || 0) > 0) {
      details.push(`✓ Name servers: ${result.nsRecords.length} authoritative DNS server${result.nsRecords.length > 1 ? 's' : ''}`);
    }

    if ((result.txtRecords?.length || 0) > 0) {
      details.push(`✓ TXT records: ${result.txtRecords.length} record${result.txtRecords.length > 1 ? 's' : ''} (likely for verification/security policies)`);
    }

    if (result.ttl !== null && result.ttl !== undefined) {
      const ttlHours = Math.floor(result.ttl / 3600);
      if (ttlHours > 0) {
        details.push(`Cache time: ${ttlHours} hour${ttlHours > 1 ? 's' : ''} (records cached to reduce DNS queries)`);
      } else {
        details.push(`Cache time: ${result.ttl} seconds (frequent updates expected)`);
      }
    }

    return {
      title: 'DNS Resolution Successful',
      summary: `${result.domain} is properly configured with ${totalRecords} DNS record${totalRecords > 1 ? 's' : ''} across multiple types.`,
      details,
      severity,
    };
  } catch (error) {
    console.error('Error in interpretDnsResult:', error);
    return {
      title: 'Interpretation Error',
      summary: 'Unable to interpret DNS results.',
      details: ['An error occurred while analyzing the DNS data.'],
      severity: 'error',
    };
  }
};

export const interpretHttpResult = (result: {
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength: number;
  contentType: string;
  redirectUrl: string | null;
  error: string | null;
}): OverallInterpretation => {
  if (result.error) {
    return {
      title: 'HTTP Request Failed',
      summary: `Unable to connect to ${result.url}. The server may be down or unreachable.`,
      details: [
        'Possible causes: Server offline, incorrect URL, network issues, CORS restrictions',
        'Try: Verify the URL is correct and accessible in a browser',
        'Check if the server is running and responding to requests',
      ],
      severity: 'error',
    };
  }

  const details: string[] = [];
  let severity: 'success' | 'info' | 'warning' | 'error' = 'success';
  let title = '';
  let summary = '';

  // Analyze status code
  if (result.statusCode >= 200 && result.statusCode < 300) {
    title = 'Request Successful';
    summary = `The server responded successfully with status ${result.statusCode}. `;
    details.push(`✓ Status ${result.statusCode}: ${getStatusCodeMeaning(result.statusCode)}`);
  } else if (result.statusCode >= 300 && result.statusCode < 400) {
    title = 'Redirection';
    summary = `Request redirected (status ${result.statusCode}). `;
    severity = 'info';
    details.push(`→ Status ${result.statusCode}: ${getStatusCodeMeaning(result.statusCode)}`);
    if (result.redirectUrl) {
      details.push(`Redirecting to: ${result.redirectUrl}`);
    }
  } else if (result.statusCode >= 400 && result.statusCode < 500) {
    title = 'Client Error';
    summary = `Request failed with status ${result.statusCode}. `;
    severity = 'warning';
    details.push(`⚠ Status ${result.statusCode}: ${getStatusCodeMeaning(result.statusCode)}`);
  } else {
    title = 'Server Error';
    summary = `Server error (status ${result.statusCode}). `;
    severity = 'error';
    details.push(`✕ Status ${result.statusCode}: ${getStatusCodeMeaning(result.statusCode)}`);
  }

  // Analyze response time
  if (result.responseTime < 100) {
    summary += `Response time is excellent (${result.responseTime}ms).`;
    details.push(`⚡ Very fast response: ${result.responseTime}ms`);
  } else if (result.responseTime < 300) {
    summary += `Response time is good (${result.responseTime}ms).`;
    details.push(`✓ Fast response: ${result.responseTime}ms`);
  } else if (result.responseTime < 1000) {
    summary += `Response time is acceptable (${result.responseTime}ms).`;
    details.push(`○ Acceptable response: ${result.responseTime}ms`);
  } else if (result.responseTime < 3000) {
    summary += `Response time is slow (${result.responseTime}ms).`;
    details.push(`⚠ Slow response: ${result.responseTime}ms - may affect user experience`);
    if (severity === 'success') severity = 'warning';
  } else {
    summary += `Response time is very slow (${result.responseTime}ms).`;
    details.push(`✕ Very slow response: ${result.responseTime}ms - poor performance`);
    if (severity === 'success' || severity === 'info') severity = 'warning';
  }

  // Content info
  if (result.contentType) {
    const typeInfo = interpretContentType(result.contentType);
    details.push(`Content: ${typeInfo.meaning}`);
  }

  if (result.contentLength > 0) {
    const sizeKB = (result.contentLength / 1024).toFixed(2);
    const sizeMB = (result.contentLength / 1024 / 1024).toFixed(2);
    if (result.contentLength > 1024 * 1024) {
      details.push(`Size: ${sizeMB} MB (${result.contentLength.toLocaleString()} bytes)`);
    } else {
      details.push(`Size: ${sizeKB} KB (${result.contentLength.toLocaleString()} bytes)`);
    }
  }

  return {
    title,
    summary,
    details,
    severity,
  };
};

export const interpretTlsResult = (result: {
  host: string;
  port: number;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  signatureAlgorithm: string;
  version: number;
  subjectAlternativeNames: string[];
  error: string | null;
}): OverallInterpretation => {
  try {
    if (result.error) {
      return {
        title: 'TLS Inspection Failed',
        summary: `Unable to retrieve TLS certificate for ${result.host}:${result.port}. The server may not support TLS or is unreachable.`,
        details: [
          'Possible causes: Server doesn\'t support HTTPS, wrong port, connection blocked',
          'Port 443 is standard for HTTPS - verify the correct port is being used',
          'The server may require SNI (Server Name Indication) or have other TLS restrictions',
        ],
        severity: 'error',
      };
    }

    const details: string[] = [];
    let severity: 'success' | 'warning' | 'error' = 'success';
    let title = '';
    let summary = '';

    // Analyze expiry
    if (result.daysUntilExpiry < 0) {
      title = 'Certificate EXPIRED';
      summary = `⚠️ CRITICAL: The certificate for ${result.host} has EXPIRED ${Math.abs(result.daysUntilExpiry)} days ago! Connections are insecure.`;
      severity = 'error';
      details.push('✕ Certificate has expired - immediate renewal required!');
      details.push('All connections to this server are showing security warnings');
    } else if (result.daysUntilExpiry < 7) {
      title = 'Certificate Expiring Soon';
      summary = `⚠️ The certificate for ${result.host} expires in ${result.daysUntilExpiry} days. Immediate renewal recommended!`;
      severity = 'error';
      details.push(`✕ Only ${result.daysUntilExpiry} days until expiry - renew immediately!`);
    } else if (result.daysUntilExpiry < 30) {
      title = 'Certificate Renewal Needed';
      summary = `The certificate for ${result.host} expires in ${result.daysUntilExpiry} days. Plan renewal soon to avoid service disruption.`;
      severity = 'warning';
      details.push(`⚠ Expires in ${result.daysUntilExpiry} days - schedule renewal`);
    } else {
      title = 'Certificate Valid';
      summary = `The certificate for ${result.host} is valid for ${result.daysUntilExpiry} more days.`;
      details.push(`✓ Valid for ${result.daysUntilExpiry} days`);
    }

    // Certificate details
    details.push(`Issued by: ${result.issuer || 'Unknown'}`);
    
    if (result.validFrom && result.validTo) {
      try {
        details.push(`Valid from ${new Date(result.validFrom).toLocaleDateString()} to ${new Date(result.validTo).toLocaleDateString()}`);
      } catch (e) {
        details.push(`Valid dates available`);
      }
    }

    // Analyze signature algorithm
    if (result.signatureAlgorithm) {
      const alg = result.signatureAlgorithm.toLowerCase();
      if (alg.includes('sha256') || alg.includes('sha384') || alg.includes('sha512')) {
        details.push(`✓ Strong signature: ${result.signatureAlgorithm}`);
      } else if (alg.includes('sha1')) {
        details.push(`⚠ Weak signature: ${result.signatureAlgorithm} (deprecated)`);
        if (severity === 'success') severity = 'warning';
      } else if (alg.includes('md5')) {
        details.push(`✕ Insecure signature: ${result.signatureAlgorithm} (broken!)`);
        severity = 'error';
      } else {
        details.push(`Signature: ${result.signatureAlgorithm}`);
      }
    }

    // SANs
    const sanCount = result.subjectAlternativeNames?.length || 0;
    if (sanCount > 1) {
      details.push(`✓ Covers ${sanCount} domains/subdomains`);
    } else if (sanCount === 1) {
      details.push(`Single domain certificate`);
    }

    return {
      title,
      summary,
      details,
      severity,
    };
  } catch (error) {
    console.error('Error in interpretTlsResult:', error);
    return {
      title: 'Interpretation Error',
      summary: 'Unable to interpret TLS certificate data.',
      details: ['An error occurred while analyzing the TLS certificate.'],
      severity: 'error',
    };
  }
};
