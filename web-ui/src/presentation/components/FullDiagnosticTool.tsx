import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  networkApi,
  type PingResponse,
  type DnsResponse,
  type TlsInfoResponse,
  type HttpAnalysisResponse,
  type SecurityHeadersResponse,
} from '../../infrastructure/api/networkApi';
import {
  Card,
  CardHeader,
  CardIcon,
  CardTitle,
  CardDescription,
  InputGroup,
  Label,
  Input,
  Button,
  ResultContainer,
  LoadingSpinner,
} from './StyledComponents';
import { ErrorBoundary } from './common/ErrorBoundary';
import { RecentChips } from './common/RecentChips';
import { ResultActions } from './common/ResultActions';
import { BoltIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import { theme } from '../styles/theme';

const TOOL_KEY = 'full';

type CheckState = 'pending' | 'running' | 'ok' | 'warn' | 'fail';

interface CheckResult {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
}

interface FullReport {
  host: string;
  generatedAt: string;
  ping: PingResponse | null;
  dns: DnsResponse | null;
  tls: TlsInfoResponse | null;
  http: HttpAnalysisResponse | null;
  security: SecurityHeadersResponse | null;
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1rem;
`;

const stateColor = (s: CheckState): string => {
  switch (s) {
    case 'ok': return theme.colors.success;
    case 'warn': return theme.colors.warning;
    case 'fail': return theme.colors.error;
    case 'running': return theme.colors.info;
    default: return theme.colors.textMuted;
  }
};

const Tile = styled.div<{ $state: CheckState }>`
  position: relative;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid ${p => stateColor(p.$state)};
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  transition: all ${theme.transitions.normal};
  ${p => p.$state === 'running' && `
    background: rgba(34, 211, 238, 0.06);
  `}
`;

const TileHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const TileBadge = styled.span<{ $state: CheckState }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 700;
  background: ${p => stateColor(p.$state)};
  color: #06070C;
`;

const TileDetail = styled.div`
  font-size: 0.72rem;
  color: ${theme.colors.textSecondary};
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  word-break: break-word;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};

  strong {
    color: ${theme.colors.text};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
`;

const stateGlyph = (s: CheckState): string => {
  switch (s) {
    case 'ok': return '✓';
    case 'warn': return '!';
    case 'fail': return '✕';
    case 'running': return '…';
    default: return '·';
  }
};

const FullDiagnosticContent: React.FC = () => {
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const { entries, add, clear } = useToolHistory(TOOL_KEY);
  const [searchParams] = useSearchParams();
  const autoRanRef = useRef(false);

  const updateCheck = (key: string, patch: Partial<CheckResult>) => {
    setChecks(prev => prev.map(c => (c.key === key ? { ...c, ...patch } : c)));
  };

  const runFull = async (rawHost: string) => {
    const trimmed = rawHost
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    if (!trimmed) return;

    setHost(trimmed);
    setLoading(true);
    setReport(null);
    add(trimmed);

    const initial: CheckResult[] = [
      { key: 'ping', label: 'Connectivity', state: 'running', detail: 'Pinging…' },
      { key: 'dns',  label: 'DNS records',  state: 'running', detail: 'Resolving…' },
      { key: 'tls',  label: 'TLS certificate', state: 'running', detail: 'Inspecting…' },
      { key: 'http', label: 'HTTP response', state: 'running', detail: 'Fetching…' },
      { key: 'security', label: 'Security headers', state: 'running', detail: 'Auditing…' },
    ];
    setChecks(initial);

    const httpsUrl = `https://${trimmed}`;

    const [pingR, dnsR, tlsR, httpR, secR] = await Promise.allSettled([
      networkApi.ping(trimmed),
      networkApi.dnsLookup(trimmed),
      networkApi.tlsInfo(trimmed, 443),
      networkApi.httpAnalysis(httpsUrl),
      networkApi.securityHeaders(httpsUrl),
    ]);

    const ping = pingR.status === 'fulfilled' ? pingR.value : null;
    const dns  = dnsR.status === 'fulfilled' ? dnsR.value : null;
    const tls  = tlsR.status === 'fulfilled' ? tlsR.value : null;
    const http = httpR.status === 'fulfilled' ? httpR.value : null;
    const sec  = secR.status === 'fulfilled' ? secR.value : null;

    // Ping
    if (!ping || ping.error || !ping.reachable) {
      updateCheck('ping', { state: 'fail', detail: ping?.error ?? 'Unreachable' });
    } else {
      const lat = ping.latencyMs;
      const state: CheckState = lat == null ? 'ok' : lat < 100 ? 'ok' : lat < 300 ? 'warn' : 'warn';
      updateCheck('ping', { state, detail: lat == null ? 'Reachable' : `${lat} ms` });
    }

    // DNS
    if (!dns || dns.error) {
      updateCheck('dns', { state: 'fail', detail: dns?.error ?? 'No records' });
    } else {
      const total =
        (dns.aRecords?.length ?? 0) +
        (dns.aaaaRecords?.length ?? 0) +
        (dns.mxRecords?.length ?? 0);
      updateCheck('dns', {
        state: total > 0 ? 'ok' : 'warn',
        detail: `${dns.aRecords?.length ?? 0} A · ${dns.aaaaRecords?.length ?? 0} AAAA · ${dns.mxRecords?.length ?? 0} MX`,
      });
    }

    // TLS
    if (!tls || tls.error) {
      updateCheck('tls', { state: 'fail', detail: tls?.error ?? 'No certificate' });
    } else {
      const days = tls.daysUntilExpiry;
      const state: CheckState = days > 30 ? 'ok' : days > 7 ? 'warn' : 'fail';
      updateCheck('tls', { state, detail: `Expires in ${days} day(s)` });
    }

    // HTTP
    if (!http || http.error) {
      updateCheck('http', { state: 'fail', detail: http?.error ?? 'No response' });
    } else {
      const code = http.statusCode;
      const state: CheckState = code >= 200 && code < 400 ? 'ok' : code >= 400 && code < 500 ? 'warn' : 'fail';
      updateCheck('http', { state, detail: `${code} · ${http.responseTime} ms` });
    }

    // Security
    if (!sec || sec.error) {
      updateCheck('security', { state: 'fail', detail: sec?.error ?? 'Audit failed' });
    } else {
      const grade = sec.grade;
      const state: CheckState =
        grade === 'A+' || grade === 'A' || grade === 'B' ? 'ok'
        : grade === 'C' ? 'warn'
        : 'fail';
      updateCheck('security', { state, detail: `Grade ${grade} · ${sec.score}/${sec.maxScore}` });
    }

    setReport({
      host: trimmed,
      generatedAt: new Date().toISOString(),
      ping, dns, tls, http, security: sec,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (autoRanRef.current) return;
    if (searchParams.get('tool') !== TOOL_KEY) return;
    const q = searchParams.get('q');
    if (!q) return;
    autoRanRef.current = true;
    runFull(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Card>
      <CardHeader>
        <CardIcon><BoltIcon /></CardIcon>
        <div>
          <CardTitle>Full Diagnostic</CardTitle>
          <CardDescription>Run every check at once and get a unified health report</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Host or Domain</Label>
        <Input
          type="text"
          placeholder="example.com"
          value={host}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHost(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runFull(host)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runFull(e.value)} onClear={clear} />

      <Button onClick={() => runFull(host)} disabled={loading || !host.trim()}>
        {loading ? <LoadingSpinner /> : 'Run Full Diagnostic'}
      </Button>

      {(checks.length > 0 || report) && (
        <ResultContainer success={!loading && checks.every(c => c.state === 'ok' || c.state === 'warn')}>
          <Header>
            <span>Diagnostic for <strong>{host}</strong></span>
            {report && (
              <span style={{ fontSize: '0.72rem' }}>
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            )}
          </Header>
          <Grid>
            {checks.map(c => (
              <Tile key={c.key} $state={c.state}>
                <TileHeader>
                  {c.label}
                  <TileBadge $state={c.state}>{stateGlyph(c.state)}</TileBadge>
                </TileHeader>
                <TileDetail>{c.detail}</TileDetail>
              </Tile>
            ))}
          </Grid>
          {report && (
            <ResultActions
              toolKey={TOOL_KEY}
              identifier={report.host}
              data={report as unknown as Record<string, unknown>}
              shareValue={report.host}
            />
          )}
        </ResultContainer>
      )}
    </Card>
  );
};

export const FullDiagnosticTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <FullDiagnosticContent />
    </ErrorBoundary>
  );
};
