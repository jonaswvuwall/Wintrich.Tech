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
import { InfoTooltip } from './common/InfoTooltip';
import { ResultInterpretation } from './common/ResultInterpretation';
import { ErrorBoundary } from './common/ErrorBoundary';
import {
  interpretTTL,
  interpretDnsRecordType,
  interpretDnsResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const DnsToolContent: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResponse | null>(null);

  const SafeInfoTooltip: React.FC<{ interpret: () => Interpretation }> = ({ interpret }) => {
    try {
      const interpretation = interpret();
      return <InfoTooltip interpretation={interpretation} />;
    } catch (error) {
      console.error('Error in interpretation:', error);
      return null;
    }
  };

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

  const renderRecords = (label: string, recordType: string, records: string[] | undefined) => {
    if (!records || records.length === 0) return null;
    return (
      <>
        <ResultItem>
          <ResultLabel>
            {label}
            <SafeInfoTooltip interpret={() => interpretDnsRecordType(recordType)} />
          </ResultLabel>
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
            <>
              <ErrorMessage>{result.error}</ErrorMessage>
              {(() => {
                try {
                  return <ResultInterpretation {...interpretDnsResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting DNS result:', error);
                  return null;
                }
              })()}
            </>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>Domain</ResultLabel>
                <ResultValue highlight>{result.domain}</ResultValue>
              </ResultItem>
              {result.ttl !== null && (
                <ResultItem>
                  <ResultLabel>
                    TTL (Time To Live)
                    <SafeInfoTooltip interpret={() => interpretTTL(result.ttl ?? 0)} />
                  </ResultLabel>
                  <ResultValue>{result.ttl}s</ResultValue>
                </ResultItem>
              )}
              {renderRecords('A Records (IPv4)', 'A', result.aRecords)}
              {renderRecords('AAAA Records (IPv6)', 'AAAA', result.aaaaRecords)}
              {renderRecords('MX Records', 'MX', result.mxRecords)}
              {renderRecords('NS Records', 'NS', result.nsRecords)}
              {renderRecords('TXT Records', 'TXT', result.txtRecords)}
              {(() => {
                try {
                  return <ResultInterpretation {...interpretDnsResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting DNS result:', error);
                  return null;
                }
              })()}
            </>
          )}
        </ResultContainer>
      )}
    </Card>
  );
};

export const DnsTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <DnsToolContent />
    </ErrorBoundary>
  );
};
