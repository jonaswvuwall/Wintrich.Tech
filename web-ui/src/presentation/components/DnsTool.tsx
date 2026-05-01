import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { RecentChips } from './common/RecentChips';
import { ResultActions } from './common/ResultActions';
import { DnsIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import {
  interpretTTL,
  interpretDnsRecordType,
  interpretDnsResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const TOOL_KEY = 'dns';

const DnsToolContent: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResponse | null>(null);
  const { entries, add, clear } = useToolHistory(TOOL_KEY);
  const [searchParams] = useSearchParams();
  const autoRanRef = useRef(false);

  const SafeInfoTooltip: React.FC<{ interpret: () => Interpretation }> = ({ interpret }) => {
    try {
      const interpretation = interpret();
      return <InfoTooltip interpretation={interpretation} />;
    } catch (error) {
      console.error('Error in interpretation:', error);
      return null;
    }
  };

  const runLookup = async (d: string) => {
    const trimmed = d.trim();
    if (!trimmed) return;

    setDomain(trimmed);
    setLoading(true);
    setResult(null);
    add(trimmed);

    try {
      const data = await networkApi.dnsLookup(trimmed);
      setResult(data);
    } catch (error) {
      setResult({
        domain: trimmed,
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

  useEffect(() => {
    if (autoRanRef.current) return;
    if (searchParams.get('tool') !== TOOL_KEY) return;
    const q = searchParams.get('q');
    if (!q) return;
    autoRanRef.current = true;
    runLookup(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        <CardIcon><DnsIcon /></CardIcon>
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
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runLookup(domain)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runLookup(e.value)} onClear={clear} />

      <Button onClick={() => runLookup(domain)} disabled={loading || !domain.trim()}>
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
          <ResultActions
            toolKey={TOOL_KEY}
            identifier={result.domain}
            data={result as unknown as Record<string, unknown>}
            shareValue={result.domain}
          />
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
