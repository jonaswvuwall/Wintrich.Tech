import React, { useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { networkApi, type TracerouteResponse, type TracerouteHop } from '../../infrastructure/api/networkApi';
import {
  Card, CardHeader, CardIcon, CardTitle, CardDescription,
  InputGroup, Label, Input, Button, ErrorMessage, LoadingSpinner,
} from './StyledComponents';
import { TraceIcon } from './common/ToolIcons';
import { ErrorBoundary } from './common/ErrorBoundary';
import { theme } from '../styles/theme';

/* ─────────────────────────────────────────────────────────────────────
   World-map projection (equirectangular). The viewBox is 720×360 so
   each degree is exactly 2 px wide / 1 px tall — easy mental model.
   ───────────────────────────────────────────────────────────────────── */
const MAP_W = 720;
const MAP_H = 360;
const project = (lat: number, lon: number) => ({
  x: (lon + 180) * (MAP_W / 360),
  y: (90 - lat) * (MAP_H / 180),
});

/* A very low-poly continent silhouette (public-domain simplified).
   Good enough as a backdrop — not a precise map. */
const CONTINENTS_PATH = `
M 137 99 L 165 88 L 195 96 L 215 112 L 235 108 L 252 124 L 245 142 L 260 152
L 248 168 L 230 172 L 215 188 L 196 192 L 178 184 L 165 168 L 152 158 L 144 142 L 138 122 Z
M 282 96 L 308 84 L 340 84 L 364 96 L 388 100 L 416 92 L 448 100 L 460 116
L 446 132 L 432 144 L 408 152 L 392 168 L 370 172 L 350 168 L 332 158
L 318 144 L 300 132 L 286 116 Z
M 364 188 L 384 196 L 404 212 L 408 234 L 396 252 L 380 268 L 364 280 L 348 268 L 340 244 L 348 220 L 358 200 Z
M 472 112 L 504 100 L 536 112 L 564 124 L 596 124 L 624 116 L 644 132
L 624 148 L 600 160 L 568 156 L 540 164 L 512 156 L 484 144 L 472 128 Z
M 528 180 L 548 184 L 564 200 L 552 220 L 532 224 L 520 208 Z
M 580 192 L 612 200 L 632 220 L 624 244 L 600 252 L 580 240 L 568 220 Z
M 96  144 L 116 152 L 132 168 L 124 188 L 104 196 L 84 184 L 80 164 Z
`;

/* ─────────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────────── */
const pulse = keyframes`
  0%   { opacity: 0.95; r: 4; }
  50%  { opacity: 0.4;  r: 8; }
  100% { opacity: 0;    r: 11; }
`;
const drawLine = keyframes`
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
`;
const flow = keyframes`
  to { stroke-dashoffset: -40; }
`;
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─────────────────────────────────────────────────────────────────────
   Layout
   ───────────────────────────────────────────────────────────────────── */
const Wide = styled(Card)`
  grid-column: 1 / -1;
`;

const ResultBlock = styled.div`
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const Stat = styled.div<{ $tone?: 'ok' | 'warn' | 'fail' }>`
  font-size: 0.78rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid ${theme.colors.border};
  background: rgba(255, 255, 255, 0.03);
  color: ${theme.colors.textSecondary};
  b { color: ${theme.colors.text}; font-weight: 700; }
  ${p => p.$tone === 'ok' && css`border-color: rgba(16,224,168,0.45); color: ${theme.colors.success};`}
  ${p => p.$tone === 'warn' && css`border-color: rgba(251,191,36,0.45); color: ${theme.colors.warning};`}
  ${p => p.$tone === 'fail' && css`border-color: rgba(244,63,94,0.45); color: ${theme.colors.error};`}
`;

/* Map */
const MapShell = styled.div`
  position: relative;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.10), transparent 70%),
    linear-gradient(160deg, #06070C 0%, #0A0F1A 60%, #0E1628 100%);
  border: 1px solid ${theme.colors.border};
  aspect-ratio: 2 / 1;
`;

const Grid = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.18;
`;

const MapSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

const Continents = styled.path`
  fill: rgba(124, 156, 255, 0.07);
  stroke: rgba(124, 156, 255, 0.22);
  stroke-width: 0.6;
`;

const HopLine = styled.path<{ $delay: number }>`
  fill: none;
  stroke: url(#trace-grad);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 6 4;
  filter: drop-shadow(0 0 4px rgba(34,211,238,0.55));
  animation:
    ${drawLine} 0.6s ease-out ${p => p.$delay}s both,
    ${flow} 1.4s linear ${p => p.$delay + 0.6}s infinite;
  stroke-dashoffset: 200;
`;

const HopDot = styled.circle<{ $isDest?: boolean; $delay: number }>`
  fill: ${p => p.$isDest ? theme.colors.accent : theme.colors.primary};
  stroke: rgba(255,255,255,0.95);
  stroke-width: 0.8;
  filter: drop-shadow(0 0 6px ${p => p.$isDest ? 'rgba(167,139,250,0.9)' : 'rgba(34,211,238,0.85)'});
  animation: ${fadeIn} 0.35s ease-out ${p => p.$delay}s both;
  cursor: pointer;
  transition: transform 150ms ease;
  &:hover { transform: scale(1.4); transform-origin: center; transform-box: fill-box; }
`;

const HopPulse = styled.circle<{ $isDest?: boolean }>`
  fill: none;
  stroke: ${p => p.$isDest ? theme.colors.accent : theme.colors.primary};
  stroke-width: 1.2;
  animation: ${pulse} 2.4s ease-out infinite;
`;

const HopHover = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${p => p.$x}%;
  top:  ${p => p.$y}%;
  transform: translate(-50%, calc(-100% - 14px));
  background: rgba(6,7,12,0.92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(34,211,238,0.4);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font-size: 0.72rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: ${theme.colors.text};
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  .lbl { color: ${theme.colors.textMuted}; }
`;

const Legend = styled.div`
  position: absolute;
  bottom: 0.6rem;
  left: 0.8rem;
  display: flex;
  gap: 0.9rem;
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  background: rgba(6,7,12,0.55);
  backdrop-filter: blur(8px);
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${theme.colors.border};
`;
const Swatch = styled.span<{ $color: string }>`
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: ${p => p.$color}; box-shadow: 0 0 6px ${p => p.$color};
  margin-right: 0.35rem; vertical-align: middle;
`;

/* Waterfall */
const Waterfall = styled.div`
  border: 1px solid ${theme.colors.border};
  border-radius: 14px;
  background: rgba(6,7,12,0.55);
  overflow: hidden;
`;

const Hr = styled.div`
  display: grid;
  grid-template-columns: 38px 1fr 90px 110px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.78rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.02); }
  @media (max-width: 600px) {
    grid-template-columns: 32px 1fr 70px;
    .col-asn { display: none; }
  }
`;

const HrHead = styled(Hr)`
  background: rgba(255,255,255,0.03);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${theme.colors.textMuted};
  &:hover { background: rgba(255,255,255,0.03); }
`;

const HopNum = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: ${theme.colors.textMuted};
  text-align: right;
`;

const HopMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
`;

const HopHost = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HopMeta = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
`;

const Bar = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $tone: 'ok' | 'warn' | 'fail' }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${p => Math.max(2, p.$pct)}%;
  background: ${p =>
    p.$tone === 'ok' ? 'linear-gradient(90deg, #10E0A8, #22D3EE)'
    : p.$tone === 'warn' ? 'linear-gradient(90deg, #FBBF24, #F97316)'
    : 'linear-gradient(90deg, #F43F5E, #BE123C)'};
  transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
`;

const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  color: ${theme.colors.textSecondary};
`;

const Flag = styled.span`
  display: inline-block;
  margin-right: 0.4rem;
  font-size: 0.85rem;
  line-height: 1;
`;

/* ─────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────── */
const flagFromCC = (cc: string | null): string => {
  if (!cc || cc.length !== 2) return '🌐';
  const codePoints = cc
    .toUpperCase()
    .split('')
    .map(c => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const latencyTone = (ms: number | null): 'ok' | 'warn' | 'fail' => {
  if (ms == null) return 'fail';
  if (ms < 60) return 'ok';
  if (ms < 180) return 'warn';
  return 'fail';
};

/* Plot ordered points: prepend a synthetic origin (rough geolocation of
   the user is unknown server-side, so we pick a neutral mid-Atlantic
   "ingress" point. The first public hop replaces it visually anyway). */
const buildPlottable = (hops: TracerouteHop[]) => {
  const plotted: { hop: TracerouteHop; x: number; y: number }[] = [];
  for (const h of hops) {
    if (h.lat != null && h.lon != null) {
      const { x, y } = project(h.lat, h.lon);
      plotted.push({ hop: h, x, y });
    }
  }
  return plotted;
};

const makePath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return '';
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const mx = (a.x + b.x) / 2;
    const dy = (b.y - a.y);
    // gentle quadratic curve so the line arcs above the chord
    const cx = mx;
    const cy = (a.y + b.y) / 2 - Math.min(40, Math.abs(b.x - a.x) * 0.18) - dy * 0.05;
    d.push(`Q ${cx} ${cy} ${b.x} ${b.y}`);
  }
  return d.join(' ');
};

/* ─────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────── */
const TracerouteToolContent: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TracerouteResponse | null>(null);
  const [hover, setHover] = useState<TracerouteHop | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const run = async (host: string) => {
    const trimmed = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;
    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const data = await networkApi.traceroute(trimmed);
      setResult(data);
    } catch (e) {
      setResult({
        host: trimmed,
        destinationIp: null,
        completed: false,
        hopCount: 0,
        totalDurationMs: 0,
        timestamp: new Date().toISOString(),
        hops: [],
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const plotted = useMemo(() => result ? buildPlottable(result.hops) : [], [result]);
  const pathD = useMemo(() => makePath(plotted.map(p => ({ x: p.x, y: p.y }))), [plotted]);
  const maxLatency = useMemo(() => {
    if (!result) return 1;
    return Math.max(1, ...result.hops.map(h => h.latencyMs ?? 0));
  }, [result]);

  const hoverPos = useMemo(() => {
    if (!hover || hover.lat == null || hover.lon == null) return null;
    const { x, y } = project(hover.lat, hover.lon);
    return { xPct: (x / MAP_W) * 100, yPct: (y / MAP_H) * 100 };
  }, [hover]);

  return (
    <Wide>
      <CardHeader>
        <CardIcon><TraceIcon /></CardIcon>
        <div>
          <CardTitle>Traceroute</CardTitle>
          <CardDescription>Hop-by-hop network path with geo & ASN enrichment</CardDescription>
        </div>
      </CardHeader>

      <InputGroup>
        <Label>Target Host</Label>
        <Input
          type="text"
          placeholder="example.com or 1.1.1.1"
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run(target)}
        />
      </InputGroup>

      <Button onClick={() => run(target)} disabled={loading || !target.trim()}>
        {loading ? <LoadingSpinner /> : 'Trace path'}
      </Button>

      {result && (
        <ResultBlock>
          {result.error && !result.hops.length && <ErrorMessage>{result.error}</ErrorMessage>}

          <Stats>
            <Stat $tone={result.completed ? 'ok' : 'warn'}>
              <b>{result.completed ? 'reached' : 'partial'}</b>&nbsp;destination
            </Stat>
            <Stat><b>{result.hopCount}</b>&nbsp;hops</Stat>
            <Stat><b>{result.totalDurationMs}</b>&nbsp;ms total</Stat>
            {result.destinationIp && <Stat>dest&nbsp;<b>{result.destinationIp}</b></Stat>}
            {plotted.length > 0 && <Stat><b>{plotted.length}</b>&nbsp;geolocated</Stat>}
          </Stats>

          <MapShell ref={shellRef}>
            <Grid viewBox="0 0 720 360" preserveAspectRatio="none">
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 72} y1={0} x2={i * 72} y2={360}
                      stroke="#7C9CFF" strokeWidth="0.4" />
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 60} x2={720} y2={i * 60}
                      stroke="#7C9CFF" strokeWidth="0.4" />
              ))}
            </Grid>

            <MapSvg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="trace-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%"  stopColor="#22D3EE" />
                  <stop offset="60%" stopColor="#7C9CFF" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>

              <Continents d={CONTINENTS_PATH} />

              {pathD && <HopLine d={pathD} $delay={0.15} />}

              {plotted.map((p, i) => {
                const isDest = i === plotted.length - 1;
                return (
                  <g key={`hop-${p.hop.hop}`}
                     onMouseEnter={() => setHover(p.hop)}
                     onMouseLeave={() => setHover(h => (h === p.hop ? null : h))}>
                    {isDest && <HopPulse cx={p.x} cy={p.y} r={6} $isDest />}
                    <HopDot cx={p.x} cy={p.y} r={isDest ? 5 : 3.5}
                            $isDest={isDest} $delay={0.2 + i * 0.08} />
                  </g>
                );
              })}
            </MapSvg>

            {hover && hoverPos && (
              <HopHover $x={hoverPos.xPct} $y={hoverPos.yPct}>
                <div><Flag>{flagFromCC(hover.countryCode)}</Flag>
                  hop <b>{hover.hop}</b> · {hover.city ?? hover.country ?? '—'}
                </div>
                <div className="lbl">{hover.hostname ?? hover.ip}</div>
                {hover.asnName && <div className="lbl">{hover.asn} {hover.asnName}</div>}
                {hover.latencyMs != null && <div className="lbl">{hover.latencyMs} ms</div>}
              </HopHover>
            )}

            <Legend>
              <span><Swatch $color={theme.colors.primary} />intermediate</span>
              <span><Swatch $color={theme.colors.accent} />destination</span>
            </Legend>
          </MapShell>

          <Waterfall>
            <HrHead>
              <span>#</span>
              <span>Host / IP</span>
              <span>Latency</span>
              <span className="col-asn">ASN</span>
            </HrHead>
            {result.hops.map(h => {
              const tone = latencyTone(h.latencyMs);
              const pct = h.latencyMs != null ? (h.latencyMs / maxLatency) * 100 : 0;
              return (
                <Hr key={`row-${h.hop}`}>
                  <HopNum>{h.hop.toString().padStart(2, '0')}</HopNum>
                  <HopMain>
                    <HopHost>
                      <Flag>{flagFromCC(h.countryCode)}</Flag>
                      {h.hostname ?? h.ip ?? <span style={{ color: theme.colors.textMuted }}>* * *</span>}
                    </HopHost>
                    <HopMeta>
                      {h.ip && h.hostname && <>{h.ip} · </>}
                      {h.city && <>{h.city}{h.country ? `, ${h.country}` : ''}</>}
                      {!h.city && h.country && <>{h.country}</>}
                      {h.isPrivate && <>private network</>}
                      {!h.ip && <>request timed out</>}
                    </HopMeta>
                  </HopMain>
                  <BarCol>
                    <Bar><BarFill $pct={pct} $tone={tone} /></Bar>
                    <span>{h.latencyMs != null ? `${h.latencyMs} ms` : '—'}</span>
                  </BarCol>
                  <BarCol className="col-asn">
                    {h.asn ? <>
                      <span style={{ color: theme.colors.text }}>{h.asn}</span>
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '110px',
                      }}>{h.asnName ?? ''}</span>
                    </> : <span style={{ color: theme.colors.textMuted }}>—</span>}
                  </BarCol>
                </Hr>
              );
            })}
          </Waterfall>
        </ResultBlock>
      )}
    </Wide>
  );
};

export const TracerouteTool: React.FC = () => (
  <ErrorBoundary>
    <TracerouteToolContent />
  </ErrorBoundary>
);
