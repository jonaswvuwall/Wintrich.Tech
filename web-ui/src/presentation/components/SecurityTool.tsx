import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  networkApi,
  type SecurityHeadersResponse,
  type SecurityHeaderCheck,
} from '../../infrastructure/api/networkApi';
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
  LoadingSpinner,
  ErrorMessage,
} from './StyledComponents';
import { ErrorBoundary } from './common/ErrorBoundary';
import { RecentChips } from './common/RecentChips';
import { ResultActions } from './common/ResultActions';
import { SecurityIcon } from './common/ToolIcons';
import { useToolHistory } from '../hooks/useToolHistory';
import { theme } from '../styles/theme';

const TOOL_KEY = 'security';

const gradeColor = (grade: string): string => {
  if (grade === 'A+' || grade === 'A') return theme.colors.success;
  if (grade === 'B') return '#86EFAC';
  if (grade === 'C') return theme.colors.warning;
  if (grade === 'D') return '#FB923C';
  return theme.colors.error;
};

const GradeBlock = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: ${p => `linear-gradient(135deg, ${p.$color}22, ${p.$color}05)`};
  border: 1px solid ${p => `${p.$color}55`};
  margin-bottom: 1rem;
`;

const GradeLetter = styled.div<{ $color: string }>`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  color: ${p => p.$color};
  letter-spacing: -0.04em;
  min-width: 3.5rem;
  text-align: center;
`;

const GradeMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ScoreLine = styled.div`
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};

  strong {
    color: ${theme.colors.text};
    font-weight: 600;
  }
`;

const ScoreBar = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  margin-top: 0.4rem;
`;

const ScoreFill = styled.div<{ $pct: number; $color: string }>`
  width: ${p => p.$pct}%;
  height: 100%;
  background: ${p => p.$color};
  transition: width 0.5s ease-out;
`;

const Summary = styled.p`
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
`;

const ChecksList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CheckRow = styled.li<{ $status: SecurityHeaderCheck['status'] }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid ${p =>
    p.$status === 'good' ? theme.colors.success
    : p.$status === 'warning' ? theme.colors.warning
    : theme.colors.error};
`;

const CheckIcon = styled.span<{ $status: SecurityHeaderCheck['status'] }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${p =>
    p.$status === 'good' ? theme.colors.success
    : p.$status === 'warning' ? theme.colors.warning
    : theme.colors.error};
  color: #06070C;
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 0.1rem;
  flex-shrink: 0;
`;

const CheckBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const CheckName = styled.div`
  font-weight: 600;
  font-size: 0.88rem;
  color: ${theme.colors.text};
`;

const CheckDesc = styled.div`
  font-size: 0.78rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.45;
`;

const CheckValue = styled.code`
  display: block;
  margin-top: 0.25rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  color: ${theme.colors.textMuted};
  word-break: break-all;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.25rem 0.45rem;
  border-radius: 4px;
`;

const CheckScore = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: ${theme.colors.textMuted};
  white-space: nowrap;
  align-self: center;
`;

const SecurityToolContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SecurityHeadersResponse | null>(null);
  const { entries, add, clear } = useToolHistory(TOOL_KEY);
  const [searchParams] = useSearchParams();
  const autoRanRef = useRef(false);

  const runAudit = async (target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;

    setUrl(trimmed);
    setLoading(true);
    setResult(null);
    add(trimmed);

    try {
      const data = await networkApi.securityHeaders(trimmed);
      setResult(data);
    } catch (error) {
      setResult({
        url: trimmed,
        statusCode: null,
        usesHttps: trimmed.startsWith('https://'),
        score: 0,
        maxScore: 100,
        grade: 'F',
        summary: '',
        checks: [],
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
    runAudit(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const statusGlyph = (s: SecurityHeaderCheck['status']) =>
    s === 'good' ? '✓' : s === 'warning' ? '!' : '✕';

  return (
    <Card>
      <CardHeader>
        <CardIcon><SecurityIcon /></CardIcon>
        <div>
          <CardTitle>Security Headers</CardTitle>
          <CardDescription>Audit a website's HTTP security posture and get a grade</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Website URL</Label>
        <Input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && runAudit(url)}
        />
      </InputGroup>

      <RecentChips entries={entries} onPick={(e) => runAudit(e.value)} onClear={clear} />

      <Button onClick={() => runAudit(url)} disabled={loading || !url.trim()}>
        {loading ? <LoadingSpinner /> : 'Audit Security Headers'}
      </Button>

      {result && (
        <ResultContainer success={!result.error && result.grade !== 'F'}>
          {result.error ? (
            <ErrorMessage>{result.error}</ErrorMessage>
          ) : (
            <>
              <GradeBlock $color={gradeColor(result.grade)}>
                <GradeLetter $color={gradeColor(result.grade)}>{result.grade}</GradeLetter>
                <GradeMeta>
                  <ScoreLine>
                    Score: <strong>{result.score}</strong> / {result.maxScore}
                  </ScoreLine>
                  <ScoreBar>
                    <ScoreFill
                      $pct={(result.score / result.maxScore) * 100}
                      $color={gradeColor(result.grade)}
                    />
                  </ScoreBar>
                </GradeMeta>
              </GradeBlock>
              {result.summary && <Summary>{result.summary}</Summary>}
              <ChecksList>
                {result.checks.map((c) => (
                  <CheckRow key={c.name} $status={c.status}>
                    <CheckIcon $status={c.status}>{statusGlyph(c.status)}</CheckIcon>
                    <CheckBody>
                      <CheckName>{c.name}</CheckName>
                      <CheckDesc>{c.description}</CheckDesc>
                      {c.value && <CheckValue>{c.value}</CheckValue>}
                    </CheckBody>
                    <CheckScore>{c.score}/{c.maxScore}</CheckScore>
                  </CheckRow>
                ))}
              </ChecksList>
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

export const SecurityTool: React.FC = () => {
  return (
    <ErrorBoundary>
      <SecurityToolContent />
    </ErrorBoundary>
  );
};
