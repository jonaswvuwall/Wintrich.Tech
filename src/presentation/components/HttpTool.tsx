import React, { useState } from 'react';
import { networkApi, type HttpAnalysisResponse } from '../../infrastructure/api/networkApi';
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
  interpretStatusCode,
  interpretResponseTime,
  interpretContentType,
  interpretHeaders,
  interpretHttpResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const HttpToolContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HttpAnalysisResponse | null>(null);

  const SafeInfoTooltip: React.FC<{ interpret: () => Interpretation }> = ({ interpret }) => {
    try {
      const interpretation = interpret();
      return <InfoTooltip interpretation={interpretation} />;
    } catch (error) {
      console.error('Error in interpretation:', error);
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await networkApi.httpAnalysis(url.trim());
      setResult(data);
    } catch (error) {
      setResult({
        url: url.trim(),
        statusCode: 0,
        responseTime: 0,
        contentLength: 0,
        contentType: '',
        headers: {},
        redirectUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (code: number): 'success' | 'warning' | 'error' | 'info' => {
    if (code >= 200 && code < 300) return 'success';
    if (code >= 300 && code < 400) return 'info';
    if (code >= 400 && code < 500) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon>🔍</CardIcon>
        <div>
          <CardTitle>HTTP Analysis</CardTitle>
          <CardDescription>Analyze HTTP responses and headers</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>URL</Label>
        <Input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAnalyze()}
        />
      </InputGroup>

      <Button onClick={handleAnalyze} disabled={loading || !url.trim()}>
        {loading ? <LoadingSpinner /> : 'Analyze HTTP'}
      </Button>

      {result && (
        <ResultContainer success={!result.error}>
          {result.error ? (
            <>
              <ErrorMessage>{result.error}</ErrorMessage>
              <ResultInterpretation {...interpretHttpResult(result)} />
            </>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>
                  Status Code
                  <SafeInfoTooltip interpret={() => interpretStatusCode(result.statusCode)} />
                </ResultLabel>
                <Badge variant={getStatusVariant(result.statusCode)}>
                  {result.statusCode}
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>
                  Response Time
                  <SafeInfoTooltip interpret={() => interpretResponseTime(result.responseTime)} />
                </ResultLabel>
                <ResultValue highlight>{result.responseTime} ms</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>
                  Content Type
                  <SafeInfoTooltip interpret={() => interpretContentType(result.contentType || '')} />
                </ResultLabel>
                <ResultValue>{result.contentType || 'N/A'}</ResultValue>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Content Length</ResultLabel>
                <ResultValue>{result.contentLength.toLocaleString()} bytes</ResultValue>
              </ResultItem>
              {result.redirectUrl && (
                <ResultItem>
                  <ResultLabel>Redirect URL</ResultLabel>
                  <ResultValue highlight>{result.redirectUrl}</ResultValue>
                </ResultItem>
              )}
              {Object.keys(result.headers).length > 0 && (
                <>
                  <ResultItem>
                    <ResultLabel>
                      Headers
                      <SafeInfoTooltip interpret={() => interpretHeaders(Object.keys(result.headers).length)} />
                    </ResultLabel>
                    <ResultValue>{Object.keys(result.headers).length} total</ResultValue>
                  </ResultItem>
                  {Object.entries(result.headers).slice(0, 5).map(([key, value]) => (
                    <ResultItem key={key}>
                      <ResultLabel style={{ paddingLeft: '1rem', fontSize: '0.75rem' }}>
                        {key}
                      </ResultLabel>
                      <ResultValue style={{ fontSize: '0.75rem' }}>{value}</ResultValue>
                    </ResultItem>
                  ))}
                </>
              )}
              {(() => {
                try {
                  return <ResultInterpretation {...interpretHttpResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting HTTP result:', error);
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

export const HttpTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <HttpToolContent />
    </ErrorBoundary>
  );
};
