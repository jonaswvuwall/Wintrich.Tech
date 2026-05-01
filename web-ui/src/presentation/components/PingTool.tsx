import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { networkApi, type PingResponse } from '../../infrastructure/api/networkApi';
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
import { PingIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import {
  interpretLatency,
  interpretReachability,
  interpretIPv4,
  interpretPingResult,
  type Interpretation,
} from '../../shared/utils/interpretations';

const TOOL_KEY = 'ping';

const PingToolContent: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingResponse | null>(null);
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

  const runPing = async (host: string) => {
    const trimmed = host.trim();
    if (!trimmed) return;

    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    add(trimmed);

    try {
      const data = await networkApi.ping(trimmed);
      setResult(data);
    } catch (error) {
      setResult({
        host: trimmed,
        ip: null,
        reachable: false,
        latencyMs: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-run from shareable URL (?tool=ping&q=...) — once per mount.
  useEffect(() => {
    if (autoRanRef.current) return;
    if (searchParams.get('tool') !== TOOL_KEY) return;
    const q = searchParams.get('q');
    if (!q) return;
    autoRanRef.current = true;
    runPing(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Card>
      <CardHeader>
        <CardIcon><PingIcon /></CardIcon>
        <div>
          <CardTitle>Ping Test</CardTitle>
          <CardDescription>Check connectivity and measure latency</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Target Host</Label>
        <Input
          type="text"
          placeholder="example.com or 8.8.8.8"
          value={target}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTarget(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runPing(target)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runPing(e.value)} onClear={clear} />

      <Button onClick={() => runPing(target)} disabled={loading || !target.trim()}>
        {loading ? <LoadingSpinner /> : 'Run Ping Test'}
      </Button>

      {result && (
        <ResultContainer success={result.reachable && !result.error}>
          {result.error ? (
            <>
              <ErrorMessage>{result.error}</ErrorMessage>
              {(() => {
                try {
                  return <ResultInterpretation {...interpretPingResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting Ping result:', error);
                  return null;
                }
              })()}
            </>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>
                  Status
                  <SafeInfoTooltip interpret={() => interpretReachability(result.reachable, result.host)} />
                </ResultLabel>
                <Badge variant={result.reachable ? 'success' : 'error'}>
                  {result.reachable ? 'Reachable' : 'Unreachable'}
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Host</ResultLabel>
                <ResultValue highlight>{result.host}</ResultValue>
              </ResultItem>
              {result.ip && (
                <ResultItem>
                  <ResultLabel>
                    IP Address
                    <SafeInfoTooltip interpret={() => interpretIPv4(result.ip || '')} />
                  </ResultLabel>
                  <ResultValue highlight>{result.ip}</ResultValue>
                </ResultItem>
              )}
              {result.latencyMs !== null && (
                <ResultItem>
                  <ResultLabel>
                    Latency
                    <SafeInfoTooltip interpret={() => interpretLatency(result.latencyMs ?? 0)} />
                  </ResultLabel>
                  <ResultValue highlight>{result.latencyMs} ms</ResultValue>
                </ResultItem>
              )}
              {(() => {
                try {
                  return <ResultInterpretation {...interpretPingResult(result)} />;
                } catch (error) {
                  console.error('Error interpreting Ping result:', error);
                  return null;
                }
              })()}
            </>
          )}
          <ResultActions
            toolKey={TOOL_KEY}
            identifier={result.host}
            data={result as unknown as Record<string, unknown>}
            shareValue={result.host}
          />
        </ResultContainer>
      )}
    </Card>
  );
};

export const PingTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <PingToolContent />
    </ErrorBoundary>
  );
};
