const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/network';

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
  status: number | null;
  statusText: string | null;
  responseTimeMs: number | null;
  contentType: string | null;
  server: string | null;
  headers: Record<string, string> | null;
  redirectChain: string[] | null;
  finalUrl: string | null;
  contentLength: number | null;
  error: string | null;
}

export interface TlsInfoResponse {
  host: string;
  protocol: string | null;
  cipherSuite: string | null;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validUntil: string | null;
  daysUntilExpiry: number | null;
  expired: boolean | null;
  serialNumber: string | null;
  subjectAlternativeNames: string[] | null;
  error: string | null;
}

export interface SecurityHeaderCheck {
  name: string;
  present: boolean;
  value: string | null;
  score: number;
  maxScore: number;
  description: string;
  status: 'good' | 'warning' | 'missing';
}

export interface SecurityHeadersResponse {
  url: string;
  statusCode: number | null;
  usesHttps: boolean;
  score: number;
  maxScore: number;
  grade: string;
  summary: string;
  checks: SecurityHeaderCheck[];
  error: string | null;
}

export interface EmailAuthCheck {
  name: string;
  present: boolean;
  record: string | null;
  status: 'good' | 'warning' | 'missing' | 'error';
  description: string;
  findings: string[] | null;
}

export interface EmailAuthResponse {
  domain: string;
  spf: EmailAuthCheck;
  dmarc: EmailAuthCheck;
  dkim: EmailAuthCheck;
  score: number;
  maxScore: number;
  grade: string;
  summary: string;
  error: string | null;
}

export interface WhoisResponse {
  domain: string;
  registrar: string | null;
  registrarUrl: string | null;
  createdOn: string | null;
  updatedOn: string | null;
  expiresOn: string | null;
  ageDays: number | null;
  daysUntilExpiry: number | null;
  nameServers: string[] | null;
  status: string[] | null;
  server: string | null;
  raw: string | null;
  error: string | null;
}

export interface ReportFinding {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
}

export interface FullReportResponse {
  host: string;
  generatedAt: string;
  score: number;
  maxScore: number;
  grade: string;
  summary: string;
  findings: ReportFinding[];
  ping: PingResponse | null;
  dns: DnsResponse | null;
  tls: TlsInfoResponse | null;
  http: HttpAnalysisResponse | null;
  securityHeaders: SecurityHeadersResponse | null;
  emailAuth: EmailAuthResponse | null;
  whois: WhoisResponse | null;
}

export interface SharedReportResponse {
  id: string;
  url: string;
  expiresAt: string;
}

export interface MonitorEntry {
  id: string;
  host: string;
  email: string | null;
  certWarnDays: number;
  checkHttp: boolean;
  checkTls: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastDaysUntilExpiry: number | null;
  lastHttpStatus: number | null;
  lastAlertAt: string | null;
  lastAlertReason: string | null;
}

export interface CreateMonitorRequest {
  host: string;
  email?: string;
  certWarnDays?: number;
  checkHttp?: boolean;
  checkTls?: boolean;
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

  async securityHeaders(url: string): Promise<SecurityHeadersResponse> {
    const response = await fetch(`${API_BASE_URL}/security-headers?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async emailAuth(domain: string): Promise<EmailAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/email-auth?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async whois(domain: string): Promise<WhoisResponse> {
    const response = await fetch(`${API_BASE_URL}/whois?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async fullReport(host: string): Promise<FullReportResponse> {
    const response = await fetch(`${API_BASE_URL}/full-report?host=${encodeURIComponent(host)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async shareReport(report: FullReportResponse): Promise<SharedReportResponse> {
    const base = API_BASE_URL.replace(/\/network$/, '');
    const response = await fetch(`${base}/reports/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getSharedReport(id: string): Promise<FullReportResponse> {
    const base = API_BASE_URL.replace(/\/network$/, '');
    const response = await fetch(`${base}/reports/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async listMonitors(): Promise<MonitorEntry[]> {
    const base = API_BASE_URL.replace(/\/network$/, '');
    const response = await fetch(`${base}/monitors`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async createMonitor(req: CreateMonitorRequest): Promise<MonitorEntry> {
    const base = API_BASE_URL.replace(/\/network$/, '');
    const response = await fetch(`${base}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async deleteMonitor(id: string): Promise<void> {
    const base = API_BASE_URL.replace(/\/network$/, '');
    const response = await fetch(`${base}/monitors/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  }
}

export const networkApi = new NetworkApiService();
