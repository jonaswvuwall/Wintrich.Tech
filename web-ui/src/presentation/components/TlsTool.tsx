import React, { useState } from 'react';
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
import {
  interpretCertificateExpiry,
  interpretSignatureAlgorithm,
  interpretTlsVersion,
  interpretSAN,
  interpretTlsResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const TlsToolContent: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('443');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TlsInfoResponse | null>(null);

  const SafeInfoTooltip: React.FC<{ interpret: () => Interpretation }> = ({ interpret }) => {
    try {
      const interpretation = interpret();
      return <InfoTooltip interpretation={interpretation} />;
    } catch (error) {
      console.error('Error in interpretation:', error);
      return null;
    }
  };

  const handleInspect = async () => {
    if (!host.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await networkApi.tlsInfo(host.trim(), parseInt(port) || 443);
      setResult(data);
    } catch (error) {
      setResult({
        host: host.trim(),
        port: parseInt(port) || 443,
        issuer: '',
        subject: '',
        validFrom: '',
        validTo: '',
        daysUntilExpiry: 0,
        serialNumber: '',
        signatureAlgorithm: '',
        version: 0,
        subjectAlternativeNames: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getExpiryVariant = (days: number): 'success' | 'warning' | 'error' => {
    if (days > 30) return 'success';
    if (days > 7) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon>🔒</CardIcon>
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
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleInspect()}
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

      <Button onClick={handleInspect} disabled={loading || !host.trim()}>
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
                  <SafeInfoTooltip interpret={() => interpretCertificateExpiry(result.daysUntilExpiry)} />
                </ResultLabel>
                <Badge variant={getExpiryVariant(result.daysUntilExpiry)}>
                  {result.daysUntilExpiry} days
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Subject</ResultLabel>
                <ResultValue highlight>{result.subject}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Issuer</ResultLabel>
                <ResultValue>{result.issuer}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Valid From</ResultLabel>
                <ResultValue>{new Date(result.validFrom).toLocaleDateString()}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Valid To</ResultLabel>
                <ResultValue>{new Date(result.validTo).toLocaleDateString()}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>
                  Certificate Version
                  <SafeInfoTooltip interpret={() => interpretTlsVersion(result.version)} />
                </ResultLabel>
                <ResultValue>v{result.version}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>
                  Signature Algorithm
                  <SafeInfoTooltip interpret={() => interpretSignatureAlgorithm(result.signatureAlgorithm)} />
                </ResultLabel>
                <ResultValue>{result.signatureAlgorithm}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Serial Number</ResultLabel>
                <ResultValue style={{ fontSize: '0.75rem' }}>{result.serialNumber}</ResultValue>
              </ResultItem>
              {result.subjectAlternativeNames.length > 0 && (
                <>
                  <ResultItem>
                    <ResultLabel>
                      SANs (Subject Alternative Names)
                      <SafeInfoTooltip interpret={() => interpretSAN(result.subjectAlternativeNames.length)} />
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
