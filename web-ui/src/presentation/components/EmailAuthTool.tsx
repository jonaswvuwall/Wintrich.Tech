import React, { useState } from 'react';
import styled from 'styled-components';
import { networkApi, type EmailAuthResponse, type EmailAuthCheck } from '../../infrastructure/api/networkApi';
import {
  Card, CardHeader, CardIcon, CardTitle, CardDescription,
  InputGroup, Label, Input, Button, ResultContainer, LoadingSpinner, ErrorMessage,
} from './StyledComponents';
import { ErrorBoundary } from './common/ErrorBoundary';
import { MailIcon } from './common/ToolIcons';
import { theme } from '../styles/theme';

const Row = styled.div<{ $status: string }>`
  padding: 0.85rem 1rem;
  margin-bottom: 0.6rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid ${p =>
    p.$status === 'good' ? theme.colors.success
    : p.$status === 'warning' ? theme.colors.warning
    : p.$status === 'missing' ? theme.colors.error
    : theme.colors.info};
`;

const Name = styled.div`
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.9rem;
  color: ${theme.colors.text};
`;

const Pill = styled.span<{ $status: string }>`
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 700;
  background: ${p =>
    p.$status === 'good' ? 'rgba(34,197,94,0.15)'
    : p.$status === 'warning' ? 'rgba(234,179,8,0.15)'
    : 'rgba(239,68,68,0.15)'};
  color: ${p =>
    p.$status === 'good' ? theme.colors.success
    : p.$status === 'warning' ? theme.colors.warning
    : theme.colors.error};
`;

const Desc = styled.div`
  font-size: 0.78rem;
  color: ${theme.colors.textSecondary};
  margin-top: 0.25rem;
`;

const Record = styled.code`
  display: block;
  margin-top: 0.4rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.74rem;
  color: ${theme.colors.text};
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  word-break: break-all;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
`;

const Findings = styled.ul`
  margin: 0.4rem 0 0 0;
  padding-left: 1.1rem;
  font-size: 0.76rem;
  color: ${theme.colors.textSecondary};
  li { margin: 0.15rem 0; }
`;

const renderRow = (c: EmailAuthCheck) => (
  <Row key={c.name} $status={c.status}>
    <Name>
      {c.name}
      <Pill $status={c.status}>{c.status}</Pill>
    </Name>
    <Desc>{c.description}</Desc>
    {c.record && <Record>{c.record}</Record>}
    {c.findings && c.findings.length > 0 && (
      <Findings>
        {c.findings.map((f, i) => <li key={i}>{f}</li>)}
      </Findings>
    )}
  </Row>
);

const EmailAuthContent: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailAuthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const d = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!d) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await networkApi.emailAuth(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon><MailIcon /></CardIcon>
        <div>
          <CardTitle>Email Authentication</CardTitle>
          <CardDescription>Audit SPF, DMARC and DKIM for a domain</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Domain</Label>
        <Input
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
        />
      </InputGroup>

      <Button onClick={run} disabled={loading || !domain.trim()}>
        {loading ? <LoadingSpinner /> : 'Audit Email Authentication'}
      </Button>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {result && (
        <ResultContainer success={result.error == null}>
          <div style={{ marginBottom: '0.8rem', fontSize: '0.85rem', color: theme.colors.textSecondary }}>
            <strong style={{ color: theme.colors.text }}>Grade {result.grade}</strong> — {result.summary}
          </div>
          {renderRow(result.spf)}
          {renderRow(result.dmarc)}
          {renderRow(result.dkim)}
        </ResultContainer>
      )}
    </Card>
  );
};

export const EmailAuthTool: React.FC = () => (
  <ErrorBoundary><EmailAuthContent /></ErrorBoundary>
);
