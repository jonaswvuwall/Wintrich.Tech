import React, { useState } from 'react';
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

export const PingTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingResponse | null>(null);

  const handlePing = async () => {
    if (!target.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await networkApi.ping(target.trim());
      setResult(data);
    } catch (error) {
      setResult({
        target: target.trim(),
        reachable: false,
        latency: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardIcon>📡</CardIcon>
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
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handlePing()}
        />
      </InputGroup>

      <Button onClick={handlePing} disabled={loading || !target.trim()}>
        {loading ? <LoadingSpinner /> : 'Run Ping Test'}
      </Button>

      {result && (
        <ResultContainer success={result.reachable && !result.error}>
          {result.error ? (
            <ErrorMessage>{result.error}</ErrorMessage>
          ) : (
            <>
              <ResultItem>
                <ResultLabel>Status</ResultLabel>
                <Badge variant={result.reachable ? 'success' : 'error'}>
                  {result.reachable ? 'Reachable' : 'Unreachable'}
                </Badge>
              </ResultItem>
              <ResultItem>
                <ResultLabel>Target</ResultLabel>
                <ResultValue highlight>{result.target}</ResultValue>
              </ResultItem>
              {result.latency !== null && (
                <ResultItem>
                  <ResultLabel>Latency</ResultLabel>
                  <ResultValue highlight>{result.latency} ms</ResultValue>
                </ResultItem>
              )}
            </>
          )}
        </ResultContainer>
      )}
    </Card>
  );
};
