import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { RecentChips } from './common/RecentChips';
import { ResultActions } from './common/ResultActions';
import { HttpIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import {
  interpretStatusCode,
  interpretResponseTime,
  interpretContentType,
  interpretHeaders,
  interpretHttpResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const TOOL_KEY = 'http';

const HttpToolContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HttpAnalysisResponse | null>(null);
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

  const runAnalyze = async (target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;

    setUrl(trimmed);
    setLoading(true);
    setResult(null);
    add(trimmed);

    try {
      const data = await networkApi.httpAnalysis(trimmed);
      setResult(data);
    } catch (error) {
      setResult({
        url: trimmed,
        status: null,
        statusText: null,
        responseTimeMs: null,
        contentLength: null,
        contentType: null,
        server: null,
        headers: null,
        redirectChain: null,
        finalUrl: null,
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
    runAnalyze(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getStatusVariant = (code: number): 'success' | 'warning' | 'error' | 'info' => {
    if (code >= 200 && code < 300) return 'success';
    if (code >= 300 && code < 400) return 'info';
    if (code >= 400 && code < 500) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon><HttpIcon /></CardIcon>
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
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runAnalyze(url)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runAnalyze(e.value)} onClear={clear} />

      <Button onClick={() => runAnalyze(url)} disabled={loading || !url.trim()}>
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
                  <SafeInfoTooltip interpret={() => interpretStatusCode(result.status ?? 0)} />
                </ResultLabel>
                <Badge variant={getStatusVariant(result.status ?? 0)}>
                  {result.status ?? '—'}{result.statusText ? ` ${result.statusText}` : ''}
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>
                  Response Time
                  <SafeInfoTooltip interpret={() => interpretResponseTime(result.responseTimeMs ?? 0)} />
                </ResultLabel>
                <ResultValue highlight>{result.responseTimeMs ?? '—'} ms</ResultValue>
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
                <ResultValue>{result.contentLength != null ? `${result.contentLength.toLocaleString()} bytes` : '—'}</ResultValue>
              </ResultItem>
              {result.server && (
                <ResultItem>
                  <ResultLabel>Server</ResultLabel>
                  <ResultValue>{result.server}</ResultValue>
                </ResultItem>
              )}
              {result.finalUrl && result.finalUrl !== result.url && (
                <ResultItem>
                  <ResultLabel>Final URL</ResultLabel>
                  <ResultValue highlight>{result.finalUrl}</ResultValue>
                </ResultItem>
              )}
              {result.redirectChain && result.redirectChain.length > 1 && (
                <ResultItem>
                  <ResultLabel>Redirects</ResultLabel>
                  <ResultValue>{result.redirectChain.length - 1} hop(s)</ResultValue>
                </ResultItem>
              )}
              {result.headers && Object.keys(result.headers).length > 0 && (
                <>
                  <ResultItem>
                    <ResultLabel>
                      Headers
                      <SafeInfoTooltip interpret={() => interpretHeaders(Object.keys(result.headers!).length)} />
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
          <ResultActions
            toolKey={TOOL_KEY}
            identifier={result.url}
            data={result as unknown as Record<string, unknown>}
            shareValue={result.url}
          />
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
