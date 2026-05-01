import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { networkApi, type TlsInfoResponse } from '../../infrastructure/api/networkApi';
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
  Badge,
} from './StyledComponents';
import { InfoTooltip } from './common/InfoTooltip';
import { ResultInterpretation } from './common/ResultInterpretation';
import { ErrorBoundary } from './common/ErrorBoundary';
import { RecentChips } from './common/RecentChips';
import { ResultActions } from './common/ResultActions';
import { TlsIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import {
  interpretCertificateExpiry,
  interpretSAN,
  interpretTlsResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const TOOL_KEY = 'tls';

const TlsToolContent: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('443');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TlsInfoResponse | null>(null);
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

  const runInspect = async (h: string, p: string) => {
    const trimmed = h.trim();
    if (!trimmed) return;
    const portNum = parseInt(p) || 443;

    setHost(trimmed);
    setPort(String(portNum));
    setLoading(true);
    setResult(null);
    add(trimmed, String(portNum));

    try {
      const data = await networkApi.tlsInfo(trimmed, portNum);
      setResult(data);
    } catch (error) {
      setResult({
        host: trimmed,
        protocol: null,
        cipherSuite: null,
        issuer: null,
        subject: null,
        validFrom: null,
        validUntil: null,
        daysUntilExpiry: null,
        expired: null,
        serialNumber: null,
        subjectAlternativeNames: null,
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
    runInspect(q, searchParams.get('extra') ?? '443');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getExpiryVariant = (days: number): 'success' | 'warning' | 'error' => {
    if (days > 30) return 'success';
    if (days > 7) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon><TlsIcon /></CardIcon>
        <div>
          <CardTitle>TLS/SSL Inspector</CardTitle>
          <CardDescription>Inspect certificates and security details</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Host</Label>
        <Input
          type="text"
          placeholder="example.com"
          value={host}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHost(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runInspect(host, port)}
        />
      </InputGroup>

      <InputGroup>
        <Label>Port</Label>
        <Input
          type="number"
          placeholder="443"
          value={port}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPort(e.target.value)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runInspect(e.value, e.extra ?? '443')} onClear={clear} />

      <Button onClick={() => runInspect(host, port)} disabled={loading || !host.trim()}>
        {loading ? <LoadingSpinner /> : 'Inspect Certificate'}
      </Button>

      {result && (
        <ResultContainer success={!result.error}>
          {result.error ? (
            <ErrorMessage>{result.error}</ErrorMessage>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>
                  Days Until Expiry
                  <SafeInfoTooltip interpret={() => interpretCertificateExpiry(result.daysUntilExpiry ?? 0)} />
                </ResultLabel>
                <Badge variant={getExpiryVariant(result.daysUntilExpiry ?? 0)}>
                  {result.daysUntilExpiry ?? '—'} days
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Subject</ResultLabel>
                <ResultValue highlight>{result.subject ?? '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Issuer</ResultLabel>
                <ResultValue>{result.issuer ?? '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Valid From</ResultLabel>
                <ResultValue>{result.validFrom ? new Date(result.validFrom).toLocaleDateString() : '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Valid Until</ResultLabel>
                <ResultValue>{result.validUntil ? new Date(result.validUntil).toLocaleDateString() : '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Protocol</ResultLabel>
                <ResultValue>{result.protocol ?? '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Cipher Suite</ResultLabel>
                <ResultValue style={{ fontSize: '0.78rem' }}>{result.cipherSuite ?? '—'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Serial Number</ResultLabel>
                <ResultValue style={{ fontSize: '0.75rem' }}>{result.serialNumber ?? '—'}</ResultValue>
              </ResultItem>
              {result.subjectAlternativeNames && result.subjectAlternativeNames.length > 0 && (
                <>
                  <ResultItem>
                    <ResultLabel>
                      SANs (Subject Alternative Names)
                      <SafeInfoTooltip interpret={() => interpretSAN(result.subjectAlternativeNames!.length)} />
                    </ResultLabel>
                    <ResultValue>{result.subjectAlternativeNames.length} total</ResultValue>
                  </ResultItem>
                  {result.subjectAlternativeNames.slice(0, 3).map((san, index) => (
                    <ResultItem key={index}>
                      <ResultLabel style={{ paddingLeft: '1rem' }}>└─</ResultLabel>
                      <ResultValue highlight>{san}</ResultValue>
                    </ResultItem>
                  ))}
                </>
              )}
              {(() => {
                try {
                  return <ResultInterpretation {...interpretTlsResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting TLS result:', error);
                  return null;
                }
              })()}
            </>
          )}
          <ResultActions
            toolKey={TOOL_KEY}
            identifier={`${result.host}_${port}`}
            data={result as unknown as Record<string, unknown>}
            shareValue={result.host}
            shareExtra={port}
          />
        </ResultContainer>
      )}
    </Card>
  );
};

export const TlsTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <TlsToolContent />
    </ErrorBoundary>
  );
};
