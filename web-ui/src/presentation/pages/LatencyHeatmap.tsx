import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { networkApi } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { DownloadButton } from '../components/DownloadButton';
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Hosts — 32 in 4 categories. Probe cadence × host count must stay
   under the 100 req/min/IP rate limit.  At 800 ms per probe that's
   75 req/min, full cycle every ~26 s.
   ───────────────────────────────────────────────────────────────── */
type Category = 'Public DNS' | 'Major web' | 'Global reach' | 'Dev & infra';

interface HostSpec {
  host: string;
  label: string;
  hint: string;
  category: Category;
}

const HOSTS: HostSpec[] = [
  { host: 'one.one.one.one',       label: 'Cloudflare',     hint: '1.1.1.1',       category: 'Public DNS' },
  { host: 'dns.google',            label: 'Google',         hint: '8.8.8.8',       category: 'Public DNS' },
  { host: 'dns.quad9.net',         label: 'Quad9',          hint: '9.9.9.9',       category: 'Public DNS' },
  { host: 'dns.opendns.com',       label: 'OpenDNS',        hint: 'Cisco',         category: 'Public DNS' },
  { host: 'dns.adguard-dns.com',   label: 'AdGuard',        hint: 'filtered',      category: 'Public DNS' },
  { host: 'ordns.he.net',          label: 'Hurricane',      hint: 'HE.net',        category: 'Public DNS' },
  { host: 'doh.cleanbrowsing.org', label: 'CleanBrowsing',  hint: 'security',      category: 'Public DNS' },
  { host: 'dns.nextdns.io',        label: 'NextDNS',        hint: 'private',       category: 'Public DNS' },

  { host: 'google.com',            label: 'Google',         hint: 'search',        category: 'Major web' },
  { host: 'microsoft.com',         label: 'Microsoft',      hint: 'corp',          category: 'Major web' },
  { host: 'apple.com',             label: 'Apple',          hint: 'corp',          category: 'Major web' },
  { host: 'cloudflare.com',        label: 'Cloudflare',     hint: 'edge',          category: 'Major web' },
  { host: 'netflix.com',           label: 'Netflix',        hint: 'video',         category: 'Major web' },
  { host: 'github.com',            label: 'GitHub',         hint: 'code',          category: 'Major web' },
  { host: 'wikipedia.org',         label: 'Wikipedia',      hint: 'reference',     category: 'Major web' },
  { host: 'openai.com',            label: 'OpenAI',         hint: 'ai',            category: 'Major web' },

  { host: 'baidu.com',             label: 'Baidu',          hint: '🇨🇳 China',      category: 'Global reach' },
  { host: 'yandex.ru',             label: 'Yandex',         hint: '🇷🇺 Russia',     category: 'Global reach' },
  { host: 'naver.com',             label: 'Naver',          hint: '🇰🇷 Korea',      category: 'Global reach' },
  { host: 'rakuten.co.jp',         label: 'Rakuten',        hint: '🇯🇵 Japan',      category: 'Global reach' },
  { host: 'flipkart.com',          label: 'Flipkart',       hint: '🇮🇳 India',      category: 'Global reach' },
  { host: 'mercadolibre.com',      label: 'MercadoLibre',   hint: '🇦🇷 LatAm',      category: 'Global reach' },
  { host: 'bbc.co.uk',             label: 'BBC',            hint: '🇬🇧 UK',         category: 'Global reach' },
  { host: 'abc.net.au',            label: 'ABC',            hint: '🇦🇺 Australia',  category: 'Global reach' },

  { host: 'stackoverflow.com',     label: 'StackOverflow',  hint: 'Q&A',           category: 'Dev & infra' },
  { host: 'registry.npmjs.org',    label: 'npm',            hint: 'registry',      category: 'Dev & infra' },
  { host: 'pypi.org',              label: 'PyPI',           hint: 'registry',      category: 'Dev & infra' },
  { host: 'hub.docker.com',        label: 'Docker Hub',     hint: 'registry',      category: 'Dev & infra' },
  { host: 'gitlab.com',            label: 'GitLab',         hint: 'git',           category: 'Dev & infra' },
  { host: 'nodejs.org',            label: 'Node.js',        hint: 'runtime',       category: 'Dev & infra' },
  { host: 'rust-lang.org',         label: 'Rust',           hint: 'lang',          category: 'Dev & infra' },
  { host: 'huggingface.co',        label: 'HuggingFace',    hint: 'models',        category: 'Dev & infra' },
];

const CATEGORIES: Category[] = ['Public DNS', 'Major web', 'Global reach', 'Dev & infra'];

const TICK_MS = 800;
const HISTORY = 24;

/* ─────────────────────────────────────────────────────────────────
   Per-host runtime state
   ───────────────────────────────────────────────────────────────── */
interface CellState {
  samples: number[];      // last N latencies (only successful)
  latest: number | null;
  reachable: boolean;
  error: string | null;
  lastUpdated: number;    // wall-clock ms for re-animation key
  ok: number;
  fail: number;
}

const EMPTY_CELL: CellState = {
  samples: [], latest: null, reachable: false, error: null,
  lastUpdated: 0, ok: 0, fail: 0,
};

/* Tone bands map latency → semantic tier; the cell's color and the
   sparkline stroke both derive from this. */
type Tone = 'fresh' | 'good' | 'ok' | 'warn' | 'slow' | 'bad' | 'down';

const toneOf = (ms: number | null, reachable: boolean): Tone => {
  if (!reachable || ms == null) return 'down';
  if (ms < 20)  return 'fresh';
  if (ms < 50)  return 'good';
  if (ms < 100) return 'ok';
  if (ms < 200) return 'warn';
  if (ms < 400) return 'slow';
  return 'bad';
};

const TONE_BG: Record<Tone, string> = {
  fresh: 'rgba(16, 224, 168, 0.22)',
  good:  'rgba(74, 222, 128, 0.20)',
  ok:    'rgba(251, 191, 36, 0.18)',
  warn:  'rgba(251, 146, 60, 0.20)',
  slow:  'rgba(248, 113, 113, 0.22)',
  bad:   'rgba(244, 63, 94, 0.30)',
  down:  'rgba(100, 116, 139, 0.10)',
};

const TONE_BORDER: Record<Tone, string> = {
  fresh: 'rgba(16, 224, 168, 0.55)',
  good:  'rgba(74, 222, 128, 0.50)',
  ok:    'rgba(251, 191, 36, 0.55)',
  warn:  'rgba(251, 146, 60, 0.55)',
  slow:  'rgba(248, 113, 113, 0.60)',
  bad:   'rgba(244, 63, 94, 0.75)',
  down:  'rgba(100, 116, 139, 0.30)',
};

const TONE_TEXT: Record<Tone, string> = {
  fresh: theme.colors.success,
  good:  '#4ADE80',
  ok:    theme.colors.warning,
  warn:  '#FB923C',
  slow:  '#F87171',
  bad:   theme.colors.error,
  down:  theme.colors.textMuted,
};

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(34,211,238,0.55); }
  70%  { box-shadow: 0 0 0 12px rgba(34,211,238,0);    }
  100% { box-shadow: 0 0 0 0   rgba(34,211,238,0);    }
`;

const flash = keyframes`
  0%   { transform: scale(1.18); }
  100% { transform: scale(1); }
`;

const drift1 = keyframes`
  0%, 100% { transform: translate(0%, 0%)  scale(1);    }
  50%      { transform: translate(6%, -4%) scale(1.08); }
`;
const drift2 = keyframes`
  0%, 100% { transform: translate(0%, 0%)   scale(1);    }
  50%      { transform: translate(-5%, 5%)  scale(1.06); }
`;

/* ─────────────────────────────────────────────────────────────────
   Page chrome
   ───────────────────────────────────────────────────────────────── */
const Ambient = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 70vmax; height: 70vmax;
    border-radius: 50%;
    filter: blur(90px);
    will-change: transform;
  }
  &::before {
    top: -28vmax; left: -22vmax;
    background: radial-gradient(closest-side, rgba(34,211,238,0.42), transparent 65%);
    animation: ${drift1} 32s ease-in-out infinite;
  }
  &::after {
    bottom: -28vmax; right: -22vmax;
    background: radial-gradient(closest-side, rgba(167,139,250,0.38), transparent 65%);
    animation: ${drift2} 38s ease-in-out infinite;
  }
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 35%, black 0%, transparent 90%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 35%, black 0%, transparent 90%);
`;

const Page = styled.div`
  position: fixed;
  inset: 0;
  background: ${theme.colors.background};
  overflow-y: auto;
  overflow-x: hidden;
  padding: clamp(5.5rem, 8vh, 7rem) clamp(1rem, 3vw, 2.75rem) clamp(2rem, 4vh, 3rem);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  margin: 0 0 1.5rem;
  width: 100%;
  background: rgba(6, 7, 12, 0.78);
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  padding: 0.7rem 0.85rem;
  display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  animation: ${fadeIn} 0.35s ease-out;

  &::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    padding: 1px; background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0.5; pointer-events: none;
  }
`;

const ControlBtn = styled.button<{ $primary?: boolean }>`
  height: 38px;
  padding: 0 0.95rem;
  border-radius: 10px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem; font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  ${p => p.$primary
    ? css`
        background: ${theme.gradients.brand};
        color: #06070C;
        border: 1px solid rgba(34,211,238,0.55);
        &:hover { filter: brightness(1.1); }
      `
    : css`
        background: rgba(255,255,255,0.04);
        color: ${theme.colors.text};
        border: 1px solid ${theme.colors.border};
        &:hover { border-color: rgba(34,211,238,0.45); color: ${theme.colors.primary}; }
      `}
`;

/* Compact, packed readout — the host slot has a fixed width so
   the bar can't jitter on hostname length changes, and the block
   stays small enough to never wrap to a second row. */
const Probing = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.75rem;
  color: ${theme.colors.textSecondary};
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  .host {
    color: ${theme.colors.primary};
    font-weight: 700;
    width: 14ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stats {
    color: ${theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .idle { color: ${theme.colors.textMuted}; width: 14ch; }

  @media (max-width: 560px) {
    width: 100%; order: 10; margin-left: 0;
    justify-content: flex-start;
  }
`;

const PulseDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${theme.colors.primary};
  animation: ${pulse} 1.4s ease-out infinite;
`;

/* ─────────────────────────────────────────────────────────────────
   Grid
   ───────────────────────────────────────────────────────────────── */
const Sheet = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
`;

const Section = styled.section`
  margin-bottom: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex; align-items: center; gap: 0.7rem;
  padding: 0.4rem 0.25rem 0.8rem;
`;

const SectionDot = styled.span`
  width: 10px; height: 10px;
  border-radius: 3px;
  background: ${theme.gradients.brand};
  box-shadow: 0 0 14px rgba(34,211,238,0.55);
  flex-shrink: 0;
`;

const SectionTitle = styled.span`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: ${theme.gradients.text};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const SectionCount = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.68rem;
  color: ${theme.colors.textMuted};
  letter-spacing: 0.04em;
`;

const SectionRule = styled.span`
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, ${theme.colors.borderStrong}, transparent);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 0.85rem;
`;

const Cell = styled.div<{ $tone: Tone; $active: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto auto;
  gap: 0.35rem 0.7rem;
  padding: 0.95rem 1.05rem 0.85rem;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, ${p => TONE_BORDER[p.$tone]} 0%, transparent 55%),
    linear-gradient(180deg, ${p => TONE_BG[p.$tone]} 0%, rgba(10, 12, 18, 0.55) 100%);
  border: 1px solid ${p => TONE_BORDER[p.$tone]};
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  transition: background 600ms ease, border-color 600ms ease, transform 200ms ease, box-shadow 200ms ease;
  overflow: hidden;
  cursor: default;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
    border-color: ${p => TONE_TEXT[p.$tone]};
  }

  ${p => p.$active && css`
    transform: scale(1.015);
    z-index: 2;
    &::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 14px;
      border: 1.5px solid ${theme.colors.primary};
      box-shadow:
        0 0 22px rgba(34,211,238,0.55),
        inset 0 0 18px rgba(34,211,238,0.20);
      pointer-events: none;
      animation: ${pulse} 1.4s ease-out infinite;
    }
  `}
`;

const HostName = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.colors.text};
  line-height: 1.1;
  letter-spacing: -0.01em;
  align-self: end;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const Latency = styled.div<{ $tone: Tone }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.55rem;
  font-weight: 700;
  color: ${p => TONE_TEXT[p.$tone]};
  text-shadow: 0 0 18px ${p => TONE_BORDER[p.$tone]};
  text-align: right;
  line-height: 1;
  display: inline-block;
  animation: ${flash} 280ms cubic-bezier(0.22, 1, 0.36, 1);
  small { font-size: 0.65rem; font-weight: 500; opacity: 0.65; margin-left: 3px; }
`;

const Sub = styled.div`
  grid-column: 1 / -1;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  color: ${theme.colors.textMuted};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const SparkWrap = styled.div`
  grid-column: 1 / -1;
  margin-top: 0.15rem;
`;

const Foot = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  color: ${theme.colors.textMuted};
  margin-top: 0.1rem;
`;

const Legend = styled.div`
  width: 100%;
  margin: 0.5rem 0 0;
  display: flex; flex-wrap: wrap; gap: 0.5rem 0.8rem;
  align-items: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`;

const Swatch = styled.span<{ $tone: Tone }>`
  display: inline-flex; align-items: center; gap: 0.4rem;
  &::before {
    content: '';
    width: 10px; height: 10px;
    border-radius: 3px;
    background: ${p => TONE_BG[p.$tone]};
    border: 1px solid ${p => TONE_BORDER[p.$tone]};
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Sparkline — pure SVG, auto-scaled per cell
   ───────────────────────────────────────────────────────────────── */
const Sparkline: React.FC<{ samples: number[]; tone: Tone }> = ({ samples, tone }) => {
  const W = 200;
  const H = 38;
  if (samples.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
        <line x1={0} x2={W} y1={H - 1} y2={H - 1} stroke={TONE_BORDER[tone]} strokeWidth={1} strokeDasharray="2 3" opacity={0.4} />
      </svg>
    );
  }
  const max = Math.max(...samples, 50);     // floor at 50ms so quiet hosts still show
  const min = Math.min(...samples, 0);
  const range = Math.max(1, max - min);
  const step = W / (samples.length - 1);
  const yFor = (v: number) => H - 2 - ((v - min) / range) * (H - 4);
  const pts = samples.map((v, i) => `${(i * step).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');

  /* Filled area under the line for visual weight */
  const area = `0,${H} ${pts} ${W},${H}`;
  const color = TONE_TEXT[tone];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
      <polyline points={area} fill={color} opacity={0.18} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      {/* Last-sample dot */}
      <circle cx={W} cy={yFor(samples[samples.length - 1])} r={2.2} fill={color} />
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const LatencyHeatmap: React.FC = () => {
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const init: Record<string, CellState> = {};
    HOSTS.forEach(h => { init[h.host] = EMPTY_CELL; });
    return init;
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  const idxRef = useRef(0);          // survives pause/resume
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const i = idxRef.current;
      const spec = HOSTS[i];
      setActiveIdx(i);

      networkApi.ping(spec.host)
        .then(res => {
          setCells(prev => {
            const old = prev[spec.host] ?? EMPTY_CELL;
            const samples = res.latencyMs != null && res.reachable
              ? [...old.samples, res.latencyMs].slice(-HISTORY)
              : old.samples;
            return {
              ...prev,
              [spec.host]: {
                samples,
                latest: res.latencyMs,
                reachable: res.reachable,
                error: res.error,
                lastUpdated: Date.now(),
                ok:   old.ok   + (res.reachable ? 1 : 0),
                fail: old.fail + (res.reachable ? 0 : 1),
              },
            };
          });
        })
        .catch(err => {
          setCells(prev => {
            const old = prev[spec.host] ?? EMPTY_CELL;
            return {
              ...prev,
              [spec.host]: {
                ...old,
                latest: null,
                reachable: false,
                error: err instanceof Error ? err.message : 'request failed',
                lastUpdated: Date.now(),
                fail: old.fail + 1,
              },
            };
          });
        });

      const next = (i + 1) % HOSTS.length;
      idxRef.current = next;
      if (next === 0) setCycleCount(c => c + 1);
    };

    // Fire one immediately so the user sees motion right away.
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  /* Group hosts by category for the sectioned grid */
  const grouped = useMemo(() => {
    const g = {} as Record<Category, HostSpec[]>;
    CATEGORIES.forEach(c => { g[c] = []; });
    HOSTS.forEach(h => g[h.category].push(h));
    return g;
  }, []);

  const probedTotal = useMemo(
    () => Object.values(cells).reduce((s, c) => s + c.ok + c.fail, 0),
    [cells]
  );

  const activeHost = activeIdx != null ? HOSTS[activeIdx] : null;

  return (
    <Page>
      <Ambient />
      <GridOverlay />
      <TopBar>
        <VisualizeTabs />
        <ControlBtn $primary={paused} onClick={() => setPaused(p => !p)}>
          {paused ? '▶ Resume' : '❚❚ Pause'}
        </ControlBtn>
        <Probing>
          {!paused && <PulseDot />}
          {activeHost ? (
            <span className="host" title={activeHost.host}>{activeHost.host}</span>
          ) : (
            <span className="idle">idle</span>
          )}
          <span className="stats">
            {activeHost ? `c${cycleCount + 1} · ${probedTotal}` : 'press resume'}
          </span>
        </Probing>
        <DownloadButton
          getTarget={() => sheetRef.current}
          filename="latency-heatmap"
          disabled={probedTotal === 0}
          title="Download heatmap as PNG"
        />
      </TopBar>

      <Sheet ref={sheetRef}>
        {CATEGORIES.map(cat => (
          <Section key={cat}>
            <SectionHeader>
              <SectionDot />
              <SectionTitle>{cat}</SectionTitle>
              <SectionCount>{grouped[cat].length} hosts</SectionCount>
              <SectionRule />
            </SectionHeader>
            <Grid>
              {grouped[cat].map(h => {
                const c = cells[h.host] ?? EMPTY_CELL;
                const tone = toneOf(c.latest, c.reachable);
                const isActive = activeHost?.host === h.host;
                const total = c.ok + c.fail;
                const loss = total > 0 ? Math.round((c.fail / total) * 100) : 0;
                return (
                  <Cell key={h.host} $tone={tone} $active={isActive && !paused}>
                    <HostName title={h.host}>{h.label}</HostName>
                    <Latency
                      $tone={tone}
                      key={c.lastUpdated /* re-mount → flash animation */}
                    >
                      {c.latest != null
                        ? <>{c.latest}<small> ms</small></>
                        : (total === 0 ? <small>—</small> : <small>down</small>)}
                    </Latency>
                    <Sub>{h.host} · {h.hint}</Sub>
                    <SparkWrap>
                      <Sparkline samples={c.samples} tone={tone} />
                    </SparkWrap>
                    <Foot>
                      <span>{total > 0 ? `${c.ok}/${total}` : 'waiting'}</span>
                      <span>
                        {loss > 0 && <>loss {loss}%</>}
                        {loss === 0 && total > 1 && c.samples.length > 1 && (
                          <>jitter {jitter(c.samples)} ms</>
                        )}
                      </span>
                    </Foot>
                  </Cell>
                );
              })}
            </Grid>
          </Section>
        ))}

        <Legend>
          <Swatch $tone="fresh">&lt;20 ms</Swatch>
          <Swatch $tone="good">&lt;50 ms</Swatch>
          <Swatch $tone="ok">&lt;100 ms</Swatch>
          <Swatch $tone="warn">&lt;200 ms</Swatch>
          <Swatch $tone="slow">&lt;400 ms</Swatch>
          <Swatch $tone="bad">≥400 ms</Swatch>
          <Swatch $tone="down">unreachable</Swatch>
          <span style={{ marginLeft: 'auto' }}>
            ICMP from the server · one probe / {TICK_MS} ms · full cycle ≈ {Math.round((HOSTS.length * TICK_MS) / 1000)} s
          </span>
        </Legend>
      </Sheet>

      <ScrollToTop />
    </Page>
  );
};

/* Standard-deviation-ish jitter measure: mean absolute delta between
   consecutive samples. Good enough for a one-glance UI number. */
function jitter(samples: number[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1]);
  return Math.round(sum / (samples.length - 1));
}
