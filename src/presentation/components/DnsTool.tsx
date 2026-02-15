import React, { useState } from 'react';
import { networkApi, type DnsResponse } from '../../infrastructure/api/networkApi';
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
  ResultItem,
  ResultLabel,
  ResultValue,
  LoadingSpinner,
  ErrorMessage,
} from './StyledComponents';

export const DnsTool: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResponse | null>(null);

  const handleLookup = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await networkApi.dnsLookup(domain.trim());
      setResult(data);
    } catch (error) {
      setResult({
        domain: domain.trim(),
        aRecords: [],
        aaaaRecords: [],
        mxRecords: [],
        nsRecords: [],
        txtRecords: [],
        ttl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRecords = (label: string, records: string[]) => {
    if (records.length === 0) return null;
    return (
      <>
        <ResultItem>
          <ResultLabel>{label}</ResultLabel>
          <ResultValue>{records.length} record(s)</ResultValue>
        </ResultItem>
        {records.map((record, index) => (
          <ResultItem key={index}>
            <ResultLabel style={{ paddingLeft: '1rem' }}>└─</ResultLabel>
            <ResultValue highlight>{record}</ResultValue>
          </ResultItem>
        ))}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon>🌐</CardIcon>
        <div>
          <CardTitle>DNS Lookup</CardTitle>
          <CardDescription>Query DNS records for any domain</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Domain Name</Label>
        <Input
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDomain(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleLookup()}
        />
      </InputGroup>

      <Button onClick={handleLookup} disabled={loading || !domain.trim()}>
        {loading ? <LoadingSpinner /> : 'Query DNS Records'}
      </Button>

      {result && (
        <ResultContainer success={!result.error}>
          {result.error ? (
            <ErrorMessage>{result.error}</ErrorMessage>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>Domain</ResultLabel>
                <ResultValue highlight>{result.domain}</ResultValue>
              </ResultItem>
              {result.ttl !== null && (
                <ResultItem>
                  <ResultLabel>TTL</ResultLabel>
                  <ResultValue>{result.ttl}s</ResultValue>
                </ResultItem>
              )}
              {renderRecords('A Records (IPv4)', result.aRecords)}
              {renderRecords('AAAA Records (IPv6)', result.aaaaRecords)}
              {renderRecords('MX Records', result.mxRecords)}
              {renderRecords('NS Records', result.nsRecords)}
              {renderRecords('TXT Records', result.txtRecords)}
            </>
          )}
        </ResultContainer>
      )}
    </Card>
  );
};
