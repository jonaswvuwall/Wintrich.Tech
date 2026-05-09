import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  networkApi,
  type TlsHandshakeResponse,
  type TlsHandshakePhase,
} from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { Button, Input, LoadingSpinner } from '../components/StyledComponents';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const slideRight = keyframes`
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
`;
const dotShine = keyframes`
  0%, 100% { box-shadow: 0 0 12px rgba(34,211,238,0.55); }
  50%      { box-shadow: 0 0 20px rgba(34,211,238,0.95); }
`;
const cosmicDrift = keyframes`
  0%   { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
`;

/* ─────────────────────────────────────────────────────────────────
   Page chrome — full bleed dark background, content in central card
   ───────────────────────────────────────────────────────────────── */

const Page = styled.div`
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.08), transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(167,139,250,0.08), transparent 60%),
    #06070C;
  overflow: auto;
  padding: clamp(5.5rem, 8vh, 7rem) 1rem 4rem;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      linear-gradient(120deg, transparent 0%, rgba(34,211,238,0.04) 25%, transparent 50%, rgba(167,139,250,0.04) 75%, transparent 100%);
    background-size: 400% 400%;
    animation: ${cosmicDrift} 22s ease infinite;
    pointer-events: none;
    z-index: 0;
  }
`;

const TopBar = styled.header`
  position: relative;
  z-index: 2;
  margin: 0 auto 1.4rem;
  width: min(900px, 100%);
  background: rgba(6, 7, 12, 0.78);
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  padding: 0.7rem 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  backdrop-filter: blur(20px) saturate(140%);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  animation: ${fadeIn} 0.5s ease-out;

  &::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    padding: 1px; background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0.5; pointer-events: none;
  }

  @media (max-width: 560px) {
    padding: 0.55rem 0.6rem;
    gap: 0.4rem;
  }
`;

const InputCell = styled.div`
  flex: 1 1 200px; min-width: 0;
  input { margin: 0; height: 38px; padding: 0 0.85rem; font-size: 0.85rem; }
  @media (max-width: 480px) { input { font-size: 0.8rem; padding: 0 0.6rem; } }
`;

const RunBtn = styled(Button)`
  width: auto; min-width: 110px; height: 38px;
  padding: 0 1.1rem; font-size: 0.85rem; border-radius: 10px; flex-shrink: 0;
  @media (max-width: 480px) { min-width: 0; padding: 0 0.85rem; font-size: 0.8rem; }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  margin: 0 auto;
  width: min(900px, 100%);
  display: grid;
  gap: 1rem;
`;

const Card = styled.section`
  position: relative;
  background: rgba(11, 13, 22, 0.7);
  border: 1px solid ${theme.colors.border};
  border-radius: 18px;
  padding: 1.4rem;
  backdrop-filter: blur(16px) saturate(140%);
  animation: ${fadeIn} 0.5s ease-out;

  &::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    padding: 1px; background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0.4; pointer-events: none;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const TotalBadge = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: ${theme.colors.textSecondary};
  b {
    color: ${theme.colors.primary};
    font-weight: 700;
    font-size: 1.4rem;
    margin-right: 0.25rem;
  }
`;

/* ── Waterfall ──────────────────────────────────────────── */

const Waterfall = styled.div`
  display: grid;
  gap: 0.85rem;
  position: relative;
`;

const PhaseRow = styled.div`
  display: grid;
  grid-template-columns: minmax(80px, 110px) 1fr minmax(70px, auto);
  gap: 0.85rem;
  align-items: center;
  animation: ${fadeIn} 0.4s ease-out both;

  @media (max-width: 560px) {
    grid-template-columns: 80px 1fr 60px;
    gap: 0.5rem;
  }
`;

const PhaseLabel = styled.div<{ $success: boolean }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${p => p.$success ? theme.colors.text : theme.colors.error};
  display: flex;
  align-items: center;
  gap: 0.4rem;

  small {
    display: block;
    font-size: 0.62rem;
    font-weight: 400;
    color: ${theme.colors.textMuted};
    margin-top: 0.15rem;
  }

  @media (max-width: 560px) { font-size: 0.7rem; small { display: none; } }
`;

const PhaseDot = styled.span<{ $color: string }>`
  width: 9px; height: 9px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
  animation: ${dotShine} 2.4s ease-in-out infinite;
`;

const Track = styled.div`
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  border-radius: 6px;
  overflow: hidden;
`;

const Bar = styled.div<{ $startPct: number; $widthPct: number; $color: string; $delay: number }>`
  position: absolute;
  top: 0; bottom: 0;
  left: ${p => p.$startPct}%;
  width: ${p => Math.max(p.$widthPct, 1)}%;
  background: linear-gradient(90deg, ${p => p.$color}55, ${p => p.$color});
  border-radius: 4px;
  box-shadow: 0 0 12px ${p => p.$color}66, inset 0 0 8px rgba(255,255,255,0.1);
  transform-origin: left;
  animation: ${slideRight} 600ms cubic-bezier(0.22, 0.9, 0.32, 1) ${p => p.$delay}ms both;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    background-size: 200% 100%;
    animation: ${cosmicDrift} 3s linear infinite;
  }
`;

const PhaseDuration = styled.div<{ $success: boolean }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: right;
  color: ${p => p.$success ? theme.colors.text : theme.colors.error};
  small { color: ${theme.colors.textMuted}; font-weight: 400; }
`;

const PhaseDetail = styled.div<{ $error?: boolean }>`
  grid-column: 2 / 3;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  color: ${p => p.$error ? theme.colors.error : theme.colors.textMuted};
  margin-top: -0.45rem;
  margin-bottom: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${p => p.$error && css`color: ${theme.colors.error};`}
`;

/* ── Cert / connection meta ─────────────────────────────── */

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
`;

const MetaCell = styled.div`
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  padding: 0.7rem 0.9rem;

  .lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${theme.colors.textMuted};
    margin-bottom: 0.3rem;
  }
  .val {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.82rem;
    color: ${theme.colors.text};
    word-break: break-all;
  }
`;

const ExpiryBadge = styled.span<{ $tone: 'ok' | 'warn' | 'fail' }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.4rem;
  ${p => p.$tone === 'ok'   && css`background: rgba(16,224,168,0.12); color: ${theme.colors.success}; border: 1px solid rgba(16,224,168,0.3);`}
  ${p => p.$tone === 'warn' && css`background: rgba(251,191,36,0.12); color: ${theme.colors.warning}; border: 1px solid rgba(251,191,36,0.3);`}
  ${p => p.$tone === 'fail' && css`background: rgba(244,63,94,0.12); color: ${theme.colors.error};   border: 1px solid rgba(244,63,94,0.3);`}
`;

const EmptyHint = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: ${theme.colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.6;
  small { display: block; font-size: 0.75rem; margin-top: 0.5rem; opacity: 0.7; }
`;

const ErrorBanner = styled.div`
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: ${theme.colors.error};
  padding: 0.85rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
`;

/* ─────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────── */
const PHASE_COLORS: Record<string, string> = {
  DNS:  '#22D3EE',
  TCP:  '#60A5FA',
  TLS:  '#A78BFA',
  TTFB: '#10E0A8',
};

const expiryTone = (days: number | null | undefined): 'ok' | 'warn' | 'fail' => {
  if (days == null) return 'fail';
  if (days <= 14) return 'fail';
  if (days <= 60) return 'warn';
  return 'ok';
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const TlsHandshake: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TlsHandshakeResponse | null>(null);

  const run = async (host: string) => {
    const trimmed = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;
    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const data = await networkApi.tlsHandshake(trimmed);
      setResult(data);
    } catch (e) {
      setResult({
        host: trimmed, port: 443, resolvedIp: null,
        protocol: null, cipherSuite: null, issuer: null, subject: null,
        certDaysUntilExpiry: null, totalMs: 0,
        timestamp: new Date().toISOString(), phases: [],
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally { setLoading(false); }
  };

  /* Scale phases across the total measured wall time. */
  const scale = result && result.phases.length > 0
    ? Math.max(result.totalMs, ...result.phases.map(p => p.startMs + p.durationMs), 1)
    : 1;

  return (
    <Page>
      <TopBar>
        <VisualizeTabs />
        <InputCell>
          <Input
            type="text"
            placeholder="example.com"
            value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(target)}
            disabled={loading}
          />
        </InputCell>
        <RunBtn onClick={() => run(target)} disabled={loading || !target.trim()}>
          {loading ? <LoadingSpinner /> : 'Connect'}
        </RunBtn>
      </TopBar>

      <Content>
        {!result && (
          <Card>
            <EmptyHint>
              Enter a host above to open a fresh TLS connection and watch each phase
              of the handshake unfold on a live waterfall.
              <small>DNS · TCP · TLS · first byte — measured to the millisecond.</small>
            </EmptyHint>
          </Card>
        )}

        {result?.error && result.phases.length === 0 && (
          <ErrorBanner>{result.error}</ErrorBanner>
        )}

        {result && result.phases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Handshake timeline · {result.host}:{result.port}</CardTitle>
              <TotalBadge><b>{result.totalMs}</b>ms total</TotalBadge>
            </CardHeader>

            <Waterfall>
              {result.phases.map((p, i) => (
                <PhaseGroup key={p.name} phase={p} scale={scale} index={i} />
              ))}
            </Waterfall>
          </Card>
        )}

        {result && (result.protocol || result.resolvedIp || result.subject) && (
          <Card>
            <CardHeader><CardTitle>Connection details</CardTitle></CardHeader>
            <MetaGrid>
              {result.resolvedIp && (
                <MetaCell><div className="lbl">Resolved IP</div><div className="val">{result.resolvedIp}</div></MetaCell>
              )}
              {result.protocol && (
                <MetaCell><div className="lbl">Protocol</div><div className="val">{result.protocol}</div></MetaCell>
              )}
              {result.cipherSuite && (
                <MetaCell><div className="lbl">Cipher</div><div className="val">{result.cipherSuite}</div></MetaCell>
              )}
              {result.subject && (
                <MetaCell><div className="lbl">Subject</div><div className="val">{result.subject}</div></MetaCell>
              )}
              {result.issuer && (
                <MetaCell><div className="lbl">Issuer</div><div className="val">{result.issuer}</div></MetaCell>
              )}
              {result.certDaysUntilExpiry != null && (
                <MetaCell>
                  <div className="lbl">Cert expires</div>
                  <div className="val">
                    {result.certDaysUntilExpiry}d
                    <ExpiryBadge $tone={expiryTone(result.certDaysUntilExpiry)}>
                      {expiryTone(result.certDaysUntilExpiry) === 'ok' ? 'healthy'
                        : expiryTone(result.certDaysUntilExpiry) === 'warn' ? 'renew soon'
                        : 'critical'}
                    </ExpiryBadge>
                  </div>
                </MetaCell>
              )}
            </MetaGrid>
          </Card>
        )}
      </Content>

      <ScrollToTop />
    </Page>
  );
};

/* Single waterfall row — phase bar + duration + detail caption. */
const PhaseGroup: React.FC<{ phase: TlsHandshakePhase; scale: number; index: number }> = ({ phase, scale, index }) => {
  const color = PHASE_COLORS[phase.name] ?? '#22D3EE';
  const startPct = (phase.startMs / scale) * 100;
  const widthPct = (phase.durationMs / scale) * 100;
  return (
    <>
      <PhaseRow style={{ animationDelay: `${index * 80}ms` }}>
        <PhaseLabel $success={phase.success}>
          <PhaseDot $color={color} />
          <div>
            {phase.name}
            <small>{phase.description}</small>
          </div>
        </PhaseLabel>
        <Track>
          <Bar
            $startPct={startPct}
            $widthPct={widthPct}
            $color={phase.success ? color : '#F43F5E'}
            $delay={index * 120 + 100}
          />
        </Track>
        <PhaseDuration $success={phase.success}>
          {phase.durationMs}<small>ms</small>
        </PhaseDuration>
      </PhaseRow>
      {phase.detail && (
        <PhaseRow style={{ animationDelay: `${index * 80 + 80}ms`, marginTop: '-0.4rem' }}>
          <div />
          <PhaseDetail $error={!phase.success}>{phase.detail}</PhaseDetail>
          <div />
        </PhaseRow>
      )}
    </>
  );
};
