import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L, { type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  networkApi,
  type TracerouteResponse,
  type TracerouteHop,
} from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { Button, Input, LoadingSpinner } from '../components/StyledComponents';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { DownloadButton } from '../components/DownloadButton';
import { InfoButton } from '../components/InfoButton';

const MAX_RUNS = 20;
const VOLATILITY_WINDOW = 3;
const DEFAULT_INTERVAL_MS = 60_000;

/* ─────────────────────────────────────────────────────────────────
   Diff & volatility helpers
   ───────────────────────────────────────────────────────────────── */
const ipAt = (run: TracerouteResponse | undefined, idx: number): string | null =>
  run?.hops[idx]?.ip ?? null;

/** Hop indices whose IP changed between two consecutive runs. */
function diffHops(prev: TracerouteResponse, curr: TracerouteResponse): Set<number> {
  const changed = new Set<number>();
  const max = Math.max(prev.hops.length, curr.hops.length);
  for (let i = 0; i < max; i++) {
    const a = ipAt(prev, i);
    const b = ipAt(curr, i);
    if (a == null && b == null) continue;
    if (a !== b) changed.add(i);
  }
  return changed;
}

/** How many distinct IPs were seen at this hop position over the last N runs. */
function volatilityAt(runs: TracerouteResponse[], idx: number, window: number): {
  count: number;
  ips: string[];
} {
  const recent = runs.slice(-window);
  const ips = new Set<string>();
  for (const r of recent) {
    const ip = ipAt(r, idx);
    if (ip) ips.add(ip);
  }
  return { count: ips.size, ips: Array.from(ips) };
}

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const dashFlow = keyframes`
  to { stroke-dashoffset: -40; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/* ─────────────────────────────────────────────────────────────────
   Leaflet base styling — mirrors Traceroute / AnycastAtlas
   ───────────────────────────────────────────────────────────────── */
const Page = styled.div`
  position: fixed; inset: 0; background: #06070C; overflow: hidden;
`;

const MapWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;

  .leaflet-container { width: 100%; height: 100%; background: #06070C; font-family: 'Inter', sans-serif; }
  .leaflet-control-attribution {
    background: rgba(6, 7, 12, 0.6) !important;
    color: ${theme.colors.textMuted} !important;
    backdrop-filter: blur(8px);
    border-radius: 8px 0 0 0;
    border-left: 1px solid ${theme.colors.border};
    border-top: 1px solid ${theme.colors.border};
    a { color: ${theme.colors.textSecondary} !important; }
  }
  .leaflet-control-zoom {
    border: 1px solid ${theme.colors.border} !important;
    background: rgba(6, 7, 12, 0.7); backdrop-filter: blur(10px);
    a {
      background: transparent !important; color: ${theme.colors.text} !important;
      border-bottom: 1px solid ${theme.colors.border} !important;
      &:hover { background: rgba(34, 211, 238, 0.15) !important; }
    }
  }

  .flap-line-latest {
    stroke-linecap: round;
    stroke-dasharray: 9 6;
    filter: drop-shadow(0 0 7px rgba(34, 211, 238, 0.55));
    animation: ${dashFlow} 1.5s linear infinite;
  }
  .flap-line-prev   { stroke-linecap: round; }
  .flap-line-ghost  { stroke-linecap: round; }
  .flap-line-glow   { stroke-linecap: round; filter: blur(2px); }

  .leaflet-tooltip.flap-tip {
    background: rgba(6, 7, 12, 0.92);
    border: 1px solid rgba(34, 211, 238, 0.4);
    border-radius: 10px;
    color: ${theme.colors.text};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    padding: 0.55rem 0.7rem;
    backdrop-filter: blur(10px);
    .lbl { color: ${theme.colors.textMuted}; }
    b { color: ${theme.colors.primary}; }
    .flap { color: #FBBF24; }
    .vol  { color: #F87171; }
    &::before { display: none; }
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Floating chrome
   ───────────────────────────────────────────────────────────────── */
const TopBar = styled.header`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  left: 0; right: 0; margin: 0 auto;
  z-index: 1000;
  width: min(1200px, calc(100% - 1rem));
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

const InputCell = styled.div`
  flex: 1 1 200px; min-width: 0;
  input { margin: 0; height: 38px; padding: 0 0.85rem; font-size: 0.85rem; }
`;

const IntervalSelect = styled.select`
  height: 38px;
  padding: 0 0.7rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid ${theme.colors.border};
  border-radius: 10px;
  color: ${theme.colors.text};
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem;
  cursor: pointer;
  &:hover { border-color: rgba(34,211,238,0.45); }
`;

const RunBtn = styled(Button)`
  width: auto; min-width: 110px; height: 38px;
  padding: 0 1.1rem; font-size: 0.85rem; border-radius: 10px; flex-shrink: 0;
`;

const SecondaryBtn = styled.button`
  height: 38px; padding: 0 0.85rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid ${theme.colors.border};
  border-radius: 10px;
  color: ${theme.colors.text};
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem; cursor: pointer;
  &:hover { border-color: rgba(34,211,238,0.45); color: ${theme.colors.primary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StatsBar = styled.div`
  position: absolute;
  top: calc(clamp(5.5rem, 8vh, 7rem) + 78px);
  left: 0; right: 0; margin: 0 auto;
  z-index: 999;
  display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center;
  width: min(1200px, calc(100% - 1rem));
  pointer-events: none;
  animation: ${fadeIn} 0.4s ease-out 0.05s both;
`;

const Stat = styled.div<{ $tone?: 'ok' | 'warn' | 'fail' | 'info' }>`
  font-size: 0.72rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${theme.colors.border};
  background: rgba(6, 7, 12, 0.7);
  backdrop-filter: blur(10px);
  color: ${theme.colors.textSecondary};
  pointer-events: auto;
  b { color: ${theme.colors.text}; font-weight: 700; }
  ${p => p.$tone === 'ok'   && css`border-color: rgba(16,224,168,0.45); color: ${theme.colors.success};`}
  ${p => p.$tone === 'warn' && css`border-color: rgba(251,191,36,0.45); color: ${theme.colors.warning};`}
  ${p => p.$tone === 'fail' && css`border-color: rgba(244,63,94,0.45);  color: ${theme.colors.error};`}
  ${p => p.$tone === 'info' && css`border-color: rgba(34,211,238,0.45); color: ${theme.colors.primary};`}
`;

const ErrorBanner = styled.div`
  position: absolute; bottom: 1.5rem;
  left: 0; right: 0; margin: 0 auto;
  z-index: 1001;
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: ${theme.colors.error};
  padding: 0.7rem 1.2rem; border-radius: 12px;
  backdrop-filter: blur(12px); font-size: 0.85rem; max-width: 90%;
  width: max-content;
`;

/* ─────────────────────────────────────────────────────────────────
   Side panel
   ───────────────────────────────────────────────────────────────── */
const SidePanel = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  right: 1rem; bottom: 1rem;
  z-index: 1000;
  width: min(380px, calc(100% - 2rem));
  display: flex; flex-direction: column;
  background: rgba(6, 7, 12, 0.82);
  border: 1px solid ${theme.colors.border};
  border-radius: 18px;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  transition: transform 300ms ease, opacity 300ms ease;
  transform: translateX(0); opacity: 1;
  ${p => !p.$open && css`
    transform: translateX(calc(100% + 1.5rem));
    opacity: 0; pointer-events: none;
  `}
  @media (max-width: 720px) {
    top: auto; right: 0; left: 0; bottom: 0;
    width: 100%; max-height: 55vh;
    border-radius: 18px 18px 0 0;
    transform: translateY(0);
    ${p => !p.$open && css`transform: translateY(calc(100% + 1rem));`}
  }
`;

const PanelHeader = styled.div`
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${theme.colors.border};
  display: flex; align-items: center; justify-content: space-between;
`;

const PanelTitle = styled.h3`
  margin: 0; font-family: 'Space Grotesk', sans-serif;
  font-size: 0.92rem; font-weight: 600; color: ${theme.colors.text};
  span { color: ${theme.colors.textMuted}; font-weight: 400; margin-left: 0.4rem; font-size: 0.78rem; }
`;

const PanelToggle = styled.button`
  background: transparent;
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  border-radius: 8px; font-size: 0.7rem;
  padding: 0.3rem 0.6rem; cursor: pointer;
  &:hover { color: ${theme.colors.primary}; border-color: rgba(34, 211, 238, 0.4); }
`;

const PanelOpenButton = styled.button<{ $visible: boolean }>`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  right: 1rem; z-index: 999;
  background: rgba(6, 7, 12, 0.82);
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.text};
  padding: 0.55rem 0.85rem;
  border-radius: 12px; font-size: 0.78rem;
  cursor: pointer; backdrop-filter: blur(12px);
  display: ${p => p.$visible ? 'block' : 'none'};
  &:hover { border-color: rgba(34, 211, 238, 0.5); }
  @media (max-width: 720px) {
    top: auto; right: 1rem; bottom: 1rem;
  }
`;

const ScrollList = styled.div`
  flex: 1; overflow-y: auto; padding: 0.4rem 0;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 3px; }
`;

const Section = styled.div`
  padding: 0.55rem 1rem 0.4rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${theme.colors.textMuted};
`;

const RunRow = styled.button<{ $active: boolean; $tone: 'stable' | 'flapped' | 'reroute' }>`
  display: grid;
  grid-template-columns: 16px 1fr auto;
  gap: 0.55rem; align-items: center;
  width: 100%; padding: 0.55rem 1rem;
  background: ${p => p.$active ? 'rgba(34,211,238,0.08)' : 'transparent'};
  border: none;
  border-left: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  text-align: left; cursor: pointer; color: inherit;
  transition: background 150ms;
  &:hover { background: rgba(34,211,238,0.05); }

  .dot {
    width: 9px; height: 9px; border-radius: 50%;
    justify-self: center;
    background: ${p => p.$tone === 'stable'  ? theme.colors.success
                     : p.$tone === 'flapped' ? theme.colors.warning
                                             : theme.colors.error};
    box-shadow: 0 0 8px ${p => p.$tone === 'stable'  ? 'rgba(16,224,168,0.5)'
                              : p.$tone === 'flapped' ? 'rgba(251,191,36,0.5)'
                                                      : 'rgba(244,63,94,0.5)'};
  }
  .body { min-width: 0; }
  .when {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.82rem; color: ${theme.colors.text};
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .meta {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.66rem; color: ${theme.colors.textMuted};
    margin-top: 0.12rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .delta {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.7rem; font-weight: 700;
    color: ${p => p.$tone === 'stable'  ? theme.colors.success
                : p.$tone === 'flapped' ? theme.colors.warning
                                        : theme.colors.error};
    white-space: nowrap;
  }
`;

const EmptyHint = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${theme.colors.textMuted};
  font-size: 0.85rem; line-height: 1.5;
  small { display: block; font-size: 0.72rem; margin-top: 0.4rem; opacity: 0.7; }
`;

/* ─────────────────────────────────────────────────────────────────
   Hop marker — color encodes stability
   ───────────────────────────────────────────────────────────────── */
const ensureStyle = () => {
  if (document.getElementById('wt-flap-style')) return;
  const s = document.createElement('style');
  s.id = 'wt-flap-style';
  s.textContent = `
    @keyframes wt-flap-pulse {
      0%   { transform: scale(1);   opacity: 0.85; }
      100% { transform: scale(2.6); opacity: 0;    }
    }
    .wt-flap-icon { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(s);
};

type HopTone = 'stable' | 'flapped' | 'volatile' | 'first';

const TONE_COLOR: Record<HopTone, string> = {
  stable:   '#22D3EE',
  flapped:  '#FBBF24',
  volatile: '#F43F5E',
  first:    '#A78BFA',
};

const buildHopIcon = (tone: HopTone, hopNum: number) => {
  const color = TONE_COLOR[tone];
  const pulse = (tone === 'flapped' || tone === 'volatile')
    ? `<span style="position:absolute; inset:-6px; border-radius:50%;
         border:1.5px solid ${color};
         animation: wt-flap-pulse 1.6s ease-out infinite; z-index:0;"></span>`
    : '';
  return L.divIcon({
    className: 'wt-flap-icon',
    html: `
      <div style="position:relative; width:22px; height:22px; transform:translate(-50%, -50%);">
        ${pulse}
        <div style="position:relative; z-index:1;
            width:22px; height:22px; border-radius:50%;
            background:rgba(6,7,12,0.92);
            border:2px solid ${color};
            box-shadow:0 0 10px ${color}aa;
            display:flex; align-items:center; justify-content:center;
            font-family:'JetBrains Mono', ui-monospace, monospace;
            font-size:9px; font-weight:700;
            color:${color};">
          ${hopNum}
        </div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [0, 0],
  });
};

const FitOnRuns: React.FC<{ points: LatLngExpression[] }> = ({ points }) => {
  const map = useMap();
  const lastN = useRef(0);
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === lastN.current) return;       // only refit when set grows
    lastN.current = points.length;
    if (points.length === 1) { map.flyTo(points[0], 3, { duration: 1 }); return; }
    const bounds = L.latLngBounds(points as L.LatLngTuple[]);
    map.flyToBounds(bounds.pad(0.25), { duration: 1.2, maxZoom: 5 });
  }, [points, map]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const RouteFlap: React.FC = () => {
  const [target, setTarget] = useState('');
  const [running, setRunning] = useState(false);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);
  const [runs, setRuns] = useState<TracerouteResponse[]>([]);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextProbeIn, setNextProbeIn] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);   // null → latest
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 720 : true
  );

  const inFlightRef = useRef(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureStyle(); }, []);

  /* ── Probe loop ──
     Re-runs traceroute every `intervalMs`.  Skips a tick if the previous
     traceroute is still in flight (the call can take 5-30s server-side). */
  useEffect(() => {
    if (!running) return;
    const targetSnap = target.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!targetSnap) return;

    let cancelled = false;
    const fire = async () => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;
      setInFlight(true);
      setError(null);
      try {
        const res = await networkApi.traceroute(targetSnap);
        if (cancelled) return;
        setRuns(prev => [...prev, res].slice(-MAX_RUNS));
        setSelectedIdx(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'traceroute failed');
      } finally {
        inFlightRef.current = false;
        if (!cancelled) setInFlight(false);
      }
    };

    fire();
    const id = setInterval(fire, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [running, target, intervalMs]);

  /* ── Countdown to next probe ── */
  useEffect(() => {
    if (!running) { setNextProbeIn(0); return; }
    setNextProbeIn(Math.round(intervalMs / 1000));
    const id = setInterval(() => {
      setNextProbeIn(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running, intervalMs, runs.length]);

  /* ── Derived data ── */
  const latest = runs.length > 0 ? runs[runs.length - 1] : null;
  const prev   = runs.length > 1 ? runs[runs.length - 2] : null;
  const flappedNow = useMemo(
    () => latest && prev ? diffHops(prev, latest) : new Set<number>(),
    [latest, prev]
  );

  /* Total flap events across history (sum of diffs between consecutive runs) */
  const totalFlaps = useMemo(() => {
    let n = 0;
    for (let i = 1; i < runs.length; i++) n += diffHops(runs[i - 1], runs[i]).size;
    return n;
  }, [runs]);

  /* Distinct destination IPs observed → indicates GeoDNS / round-robin */
  const distinctDestinations = useMemo(() => {
    const s = new Set<string>();
    runs.forEach(r => { if (r.destinationIp) s.add(r.destinationIp); });
    return s.size;
  }, [runs]);

  /* Latest hops with their volatility info, used for the marker layer */
  const latestHopAnalysis = useMemo(() => {
    if (!latest) return [] as Array<{
      hop: TracerouteHop;
      idx: number;
      tone: HopTone;
      volatility: number;
      ipsSeen: string[];
      flappedNow: boolean;
    }>;

    return latest.hops.map((hop, idx) => {
      const { count, ips } = volatilityAt(runs, idx, VOLATILITY_WINDOW);
      const flap = flappedNow.has(idx);
      let tone: HopTone = 'stable';
      if (count >= 3) tone = 'volatile';
      else if (count === 2 || flap) tone = 'flapped';
      return { hop, idx, tone, volatility: count, ipsSeen: ips, flappedNow: flap };
    });
  }, [latest, runs, flappedNow]);

  /* Polyline coordinates per run (filtered to plottable hops) */
  const paths = useMemo(() => {
    return runs.map((run, idx) => {
      const points: [number, number][] = run.hops
        .filter(h => h.lat != null && h.lon != null && !h.isPrivate)
        .map(h => [h.lat as number, h.lon as number]);
      return { run, points, idx };
    });
  }, [runs]);

  const allPoints: LatLngExpression[] = useMemo(
    () => paths.flatMap(p => p.points as LatLngExpression[]),
    [paths]
  );

  /* Run shown in the foreground — defaults to latest if nothing selected */
  const focusedPathIdx = selectedIdx ?? (paths.length - 1);

  /* Per-run summary metric for the side list */
  const runSummaries = useMemo(() => {
    return runs.map((run, idx) => {
      const prev = idx > 0 ? runs[idx - 1] : null;
      const changes = prev ? diffHops(prev, run).size : 0;
      const hopDelta = prev ? Math.abs(run.hopCount - prev.hopCount) : 0;
      let tone: 'stable' | 'flapped' | 'reroute' = 'stable';
      if (changes >= 3 || hopDelta >= 3) tone = 'reroute';
      else if (changes > 0 || hopDelta > 0) tone = 'flapped';
      return { run, changes, hopDelta, tone };
    });
  }, [runs]);

  /* ── Handlers ── */
  const toggleRunning = () => {
    if (!running && !target.trim()) return;
    setRunning(r => !r);
  };

  const clearRuns = () => {
    setRuns([]); setSelectedIdx(null); setError(null);
  };

  const focusRun = (idx: number) => {
    setSelectedIdx(idx);
    const pts = paths[idx]?.points;
    if (pts && pts.length > 0 && mapRef.current) {
      if (pts.length === 1) mapRef.current.flyTo(pts[0] as LatLngExpression, 4, { duration: 1 });
      else mapRef.current.flyToBounds(L.latLngBounds(pts), { duration: 1, maxZoom: 5 });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && target.trim() && !running) {
      setRunning(true);
    }
  };

  return (
    <Page>
      <MapWrap ref={mapWrapRef}>
        <MapContainer
          center={[20, 0]} zoom={2} minZoom={2} maxZoom={10} worldCopyJump
          ref={(m) => { mapRef.current = m as LeafletMap; }}
          attributionControl zoomControl
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
            crossOrigin=""
          />

          {/* Historical paths — fade from violet (oldest) toward cyan (newest) */}
          {paths.map(({ points, idx }) => {
            if (points.length < 2) return null;
            const isFocused = idx === focusedPathIdx;
            const isLatest  = idx === paths.length - 1;
            const age       = paths.length - 1 - idx;   // 0 = latest
            const opacity   = isFocused ? 0.92 : Math.max(0.10, 0.55 - age * 0.07);
            const color     = isLatest ? theme.colors.primary : '#A78BFA';
            return (
              <React.Fragment key={`p-${idx}-${paths[idx].run.timestamp}`}>
                {isFocused && (
                  <Polyline
                    positions={points}
                    pathOptions={{
                      className: 'flap-line-glow',
                      color: color, weight: 7, opacity: 0.22,
                    }}
                  />
                )}
                <Polyline
                  positions={points}
                  pathOptions={{
                    className: isLatest ? 'flap-line-latest' : 'flap-line-ghost',
                    color, weight: isFocused ? 2.6 : 1.4, opacity,
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Hop markers — latest run only, color encodes stability */}
          {latest && latestHopAnalysis
            .filter(h => h.hop.lat != null && h.hop.lon != null && !h.hop.isPrivate)
            .map(h => (
              <Marker
                key={`hop-${h.idx}-${h.hop.ip ?? 'noip'}`}
                position={[h.hop.lat as number, h.hop.lon as number]}
                icon={buildHopIcon(h.tone, h.hop.hop)}
              >
                <Tooltip className="flap-tip" direction="top" offset={[0, -12]} opacity={1}>
                  <div>hop <b>{h.hop.hop}</b> · {h.hop.ip ?? '—'}</div>
                  {h.hop.hostname && <div className="lbl">{h.hop.hostname}</div>}
                  <div className="lbl">
                    {h.hop.city ?? h.hop.country ?? 'unlocated'}
                    {h.hop.asnName ? ` · ${h.hop.asnName}` : ''}
                  </div>
                  {h.hop.latencyMs != null && <div className="lbl">{h.hop.latencyMs} ms</div>}
                  {h.flappedNow && <div className="flap">↺ changed in this run</div>}
                  {h.volatility > 1 && (
                    <div className="vol">{h.volatility} distinct IPs across last {Math.min(runs.length, VOLATILITY_WINDOW)} runs</div>
                  )}
                </Tooltip>
              </Marker>
            ))}

          <FitOnRuns points={allPoints} />
        </MapContainer>
      </MapWrap>

      <TopBar>
        <VisualizeTabs />
        <InputCell>
          <Input
            type="text"
            placeholder="host to trace (e.g. github.com)"
            value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={running}
          />
        </InputCell>
        <IntervalSelect
          value={intervalMs}
          onChange={e => setIntervalMs(Number(e.target.value))}
          disabled={running}
          title="Interval between traceroutes"
        >
          <option value={30_000}>every 30 s</option>
          <option value={60_000}>every 1 min</option>
          <option value={120_000}>every 2 min</option>
          <option value={300_000}>every 5 min</option>
        </IntervalSelect>
        <RunBtn onClick={toggleRunning} disabled={!target.trim() && !running}>
          {inFlight ? <LoadingSpinner /> : running ? '❚❚ Stop' : '▶ Start'}
        </RunBtn>
        <SecondaryBtn onClick={clearRuns} disabled={runs.length === 0 || running}>
          Clear
        </SecondaryBtn>
        <InfoButton title="Route flap">
          <p>
            Type a host, pick an interval and Start — the page calls
            <code> GET /api/network/traceroute?host=…</code> on a recurring timer.
            Each run shells out to the OS <code>traceroute</code> binary on the server
            and returns the full hop list.
          </p>
          <p>
            Each new run is <b>diffed against the previous one</b>: hops that appear,
            disappear, or change ASN are flagged as flaps. Stable paths fade to grey;
            flapping segments stay highlighted.
          </p>
          <p>
            The map plots the union of all observed hops; the side panel lists each run
            with its hop count and flap delta against the previous run.
          </p>
        </InfoButton>
        <DownloadButton
          getTarget={() => mapWrapRef.current?.querySelector<HTMLElement>('.leaflet-container') ?? null}
          filename={`route-flap-${target || 'map'}`}
          disabled={runs.length === 0}
          title="Download as PNG"
        />
      </TopBar>

      {runs.length > 0 && (
        <StatsBar>
          <Stat $tone="info"><b>{runs.length}</b>&nbsp;runs</Stat>
          <Stat $tone={totalFlaps > 0 ? 'warn' : 'ok'}>
            <b>{totalFlaps}</b>&nbsp;flap{totalFlaps === 1 ? '' : 's'}
          </Stat>
          {latest?.destinationIp && (
            <Stat>
              <b>{distinctDestinations}</b>&nbsp;dest IP{distinctDestinations === 1 ? '' : 's'}
              {distinctDestinations > 1 && ' (GeoDNS)'}
            </Stat>
          )}
          {latest && (
            <Stat><b>{latest.hopCount}</b>&nbsp;hops</Stat>
          )}
          {running && (
            <Stat $tone="info">
              {inFlight ? 'tracing now…' : <>next in <b>{nextProbeIn}s</b></>}
            </Stat>
          )}
        </StatsBar>
      )}

      <PanelOpenButton $visible={runs.length > 0 && !panelOpen} onClick={() => setPanelOpen(true)}>
        Run history →
      </PanelOpenButton>

      <SidePanel $open={panelOpen && runs.length > 0}>
        <PanelHeader>
          <PanelTitle>
            Run history<span>{target}</span>
          </PanelTitle>
          <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
        </PanelHeader>
        <ScrollList>
          <Section>Newest first · click to focus</Section>
          {[...runSummaries].reverse().map(({ run, changes, hopDelta, tone }, revIdx) => {
            const idx = runs.length - 1 - revIdx;
            const t = new Date(run.timestamp);
            const time = t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <RunRow
                key={`r-${idx}-${run.timestamp}`}
                $active={focusedPathIdx === idx}
                $tone={tone}
                onClick={() => focusRun(idx)}
              >
                <span className="dot" />
                <div className="body">
                  <div className="when">
                    {idx === runs.length - 1 ? 'Latest · ' : ''}{time}
                  </div>
                  <div className="meta">
                    {run.hopCount} hops
                    {run.destinationIp ? ` · ${run.destinationIp}` : ''}
                    {hopDelta > 0 ? ` · ±${hopDelta} hops` : ''}
                  </div>
                </div>
                <div className="delta">
                  {changes === 0 ? '—' : `▲${changes}`}
                </div>
              </RunRow>
            );
          })}
        </ScrollList>
      </SidePanel>

      {runs.length === 0 && !running && (
        <SidePanel $open={panelOpen}>
          <PanelHeader>
            <PanelTitle>Route-flap detector</PanelTitle>
            <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
          </PanelHeader>
          <EmptyHint>
            Enter a host above and press Start.  Each new traceroute is overlaid
            on the previous ones, hops that change IP between runs are flagged.
            <small>
              Routes that flap between two ASes within minutes usually mean
              load-balancing inside the carrier; a sudden hop-count jump or
              fresh destination IP suggests a real reroute.
            </small>
          </EmptyHint>
        </SidePanel>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}
    </Page>
  );
};
