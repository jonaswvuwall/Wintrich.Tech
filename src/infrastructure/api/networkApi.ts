const API_BASE_URL = 'http://localhost:8080/api/network';

export interface PingResponse {
  host: string;
  ip: string | null;
  reachable: boolean;
  latencyMs: number | null;
  timestamp: string;
  error: string | null;
}

export interface DnsResponse {
  domain: string;
  aRecords: string[];
  aaaaRecords: string[];
  mxRecords: string[];
  nsRecords: string[];
  txtRecords: string[];
  ttl: number | null;
  error: string | null;
}

export interface HttpAnalysisResponse {
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength: number;
  contentType: string;
  headers: Record<string, string>;
  redirectUrl: string | null;
  error: string | null;
}

export interface TlsInfoResponse {
  host: string;
  port: number;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  serialNumber: string;
  signatureAlgorithm: string;
  version: number;
  subjectAlternativeNames: string[];
  error: string | null;
}

class NetworkApiService {
  async ping(host: string): Promise<PingResponse> {
    const response = await fetch(`${API_BASE_URL}/ping?host=${encodeURIComponent(host)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async dnsLookup(domain: string): Promise<DnsResponse> {
    const response = await fetch(`${API_BASE_URL}/dns?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async httpAnalysis(url: string): Promise<HttpAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/http-analysis?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async tlsInfo(host: string, port: number = 443): Promise<TlsInfoResponse> {
    const response = await fetch(`${API_BASE_URL}/tls-info?host=${encodeURIComponent(host)}&port=${port}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

export const networkApi = new NetworkApiService();
