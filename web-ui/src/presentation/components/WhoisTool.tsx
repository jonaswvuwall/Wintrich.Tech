import React, { useState } from 'react';
import styled from 'styled-components';
import { networkApi, type WhoisResponse } from '../../infrastructure/api/networkApi';
import {
  Card, CardHeader, CardIcon, CardTitle, CardDescription,
  InputGroup, Label, Input, Button, ResultContainer, ResultItem, ResultLabel, ResultValue,
  LoadingSpinner, ErrorMessage,
} from './StyledComponents';
import { ErrorBoundary } from './common/ErrorBoundary';
import { InfoIcon } from './common/ToolIcons';
import { theme } from '../styles/theme';

const Pre = styled.pre`
  margin-top: 1rem;
  padding: 0.8rem;
  max-height: 320px;
  overflow: auto;
  font-size: 0.72rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  color: ${theme.colors.textSecondary};
  white-space: pre-wrap;
  word-break: break-word;
`;

const formatDate = (s: string | null) => s ? new Date(s).toLocaleDateString() : '—';

const WhoisContent: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const d = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!d) return;
    setLoading(true); setError(null); setResult(null);
    try { setResult(await networkApi.whois(d)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon><InfoIcon /></CardIcon>
        <div>
          <CardTitle>WHOIS Lookup</CardTitle>
          <CardDescription>Registrar, creation date, expiry and name servers</CardDescription>
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
        {loading ? <LoadingSpinner /> : 'Look up WHOIS'}
      </Button>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {result && !result.error && (
        <ResultContainer success>
          <ResultItem><ResultLabel>Registrar</ResultLabel><ResultValue>{result.registrar ?? '—'}</ResultValue></ResultItem>
          <ResultItem><ResultLabel>Created</ResultLabel><ResultValue>{formatDate(result.createdOn)}</ResultValue></ResultItem>
          <ResultItem><ResultLabel>Updated</ResultLabel><ResultValue>{formatDate(result.updatedOn)}</ResultValue></ResultItem>
          <ResultItem><ResultLabel>Expires</ResultLabel>
            <ResultValue highlight={result.daysUntilExpiry != null && result.daysUntilExpiry < 30}>
              {formatDate(result.expiresOn)}
              {result.daysUntilExpiry != null && ` (${result.daysUntilExpiry} day${result.daysUntilExpiry === 1 ? '' : 's'})`}
            </ResultValue>
          </ResultItem>
          {result.ageDays != null && (
            <ResultItem><ResultLabel>Domain age</ResultLabel><ResultValue>{Math.round(result.ageDays / 365 * 10) / 10} years</ResultValue></ResultItem>
          )}
          {result.nameServers && result.nameServers.length > 0 && (
            <ResultItem><ResultLabel>Name servers</ResultLabel><ResultValue>{result.nameServers.join(', ')}</ResultValue></ResultItem>
          )}
          {result.status && result.status.length > 0 && (
            <ResultItem><ResultLabel>Status</ResultLabel><ResultValue>{result.status.join(', ')}</ResultValue></ResultItem>
          )}
          {result.server && (
            <ResultItem><ResultLabel>WHOIS server</ResultLabel><ResultValue>{result.server}</ResultValue></ResultItem>
          )}
          {result.raw && <Pre>{result.raw}</Pre>}
        </ResultContainer>
      )}

      {result && result.error && <ErrorMessage>{result.error}</ErrorMessage>}
    </Card>
  );
};

export const WhoisTool: React.FC = () => (
  <ErrorBoundary><WhoisContent /></ErrorBoundary>
);
