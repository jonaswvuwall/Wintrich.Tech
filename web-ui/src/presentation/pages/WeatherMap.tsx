import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from 'react-leaflet';
import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { networkApi } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { DownloadButton } from '../components/DownloadButton';

/* ─────────────────────────────────────────────────────────────────
   Stations — geo-tagged hosts.  We rotate through them, ping each,
   and derive a "weather" condition (sunny/cloudy/storm/fog) from
   latency, jitter and packet loss.
   ───────────────────────────────────────────────────────────────── */
interface Station {
  host: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
}

const STATIONS: Station[] = [
  // North America
  { host: 'github.com',           label: 'GitHub',          city: 'Virginia, US',     lat:  37.5,  lon:  -77.5 },
  { host: 'archive.org',          label: 'Internet Archive',city: 'San Francisco, US',lat:  37.78, lon: -122.42 },
  { host: 'cbc.ca',               label: 'CBC',             city: 'Toronto, CA',      lat:  43.65, lon:  -79.38 },
  // Latin America
  { host: 'globo.com',            label: 'Globo',           city: 'São Paulo, BR',    lat: -23.55, lon:  -46.63 },
  { host: 'mercadolibre.com.ar',  label: 'MercadoLibre',    city: 'Buenos Aires, AR', lat: -34.61, lon:  -58.38 },
  // Europe
  { host: 'bbc.co.uk',            label: 'BBC',             city: 'London, UK',       lat:  51.50, lon:   -0.13 },
  { host: 'lemonde.fr',           label: 'Le Monde',        city: 'Paris, FR',        lat:  48.85, lon:    2.35 },
  { host: 'spiegel.de',           label: 'Der Spiegel',     city: 'Hamburg, DE',      lat:  53.55, lon:    9.99 },
  { host: 'nu.nl',                label: 'NU.nl',           city: 'Amsterdam, NL',    lat:  52.37, lon:    4.90 },
  { host: 'dn.se',                label: 'Dagens Nyheter',  city: 'Stockholm, SE',    lat:  59.33, lon:   18.07 },
  { host: 'yandex.ru',            label: 'Yandex',          city: 'Moscow, RU',       lat:  55.75, lon:   37.62 },
  // MENA / Africa
  { host: 'aljazeera.com',        label: 'Al Jazeera',      city: 'Doha, QA',         lat:  25.29, lon:   51.53 },
  { host: 'emirates.com',         label: 'Emirates',        city: 'Dubai, AE',        lat:  25.20, lon:   55.27 },
  { host: 'news24.com',           label: 'News24',          city: 'Johannesburg, ZA', lat: -26.20, lon:   28.05 },
  { host: 'nation.africa',        label: 'Nation',          city: 'Nairobi, KE',      lat:  -1.29, lon:   36.82 },
  // Asia
  { host: 'baidu.com',            label: 'Baidu',           city: 'Beijing, CN',      lat:  39.90, lon:  116.40 },
  { host: 'flipkart.com',         label: 'Flipkart',        city: 'Bangalore, IN',    lat:  12.97, lon:   77.59 },
  { host: 'rakuten.co.jp',        label: 'Rakuten',         city: 'Tokyo, JP',        lat:  35.68, lon:  139.69 },
  { host: 'naver.com',            label: 'Naver',           city: 'Seoul, KR',        lat:  37.57, lon:  126.98 },
  { host: 'shopee.sg',            label: 'Shopee',          city: 'Singapore, SG',    lat:   1.35, lon:  103.82 },
  // Oceania
  { host: 'abc.net.au',           label: 'ABC',             city: 'Sydney, AU',       lat: -33.87, lon:  151.21 },
  { host: 'stuff.co.nz',          label: 'Stuff',           city: 'Auckland, NZ',     lat: -36.85, lon:  174.76 },
];

const TICK_MS = 800;
const HISTORY = 20;

/* ─────────────────────────────────────────────────────────────────
   Per-station rolling state and derived weather tier
   ───────────────────────────────────────────────────────────────── */
interface StationState {
  samples: number[];
  latest: number | null;
  reachable: boolean;
  lastUpdated: number;
  ok: number;
  fail: number;
}

const EMPTY: StationState = {
  samples: [], latest: null, reachable: false,
  lastUpdated: 0, ok: 0, fail: 0,
};

type Tier = 'sunny' | 'mostly' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'fog';

const TIER_GLYPH: Record<Tier, string> = {
  sunny:  '☀️',
  mostly: '🌤️',
  partly: '⛅',
  cloudy: '☁️',
  rain:   '🌧️',
  storm:  '⛈️',
  fog:    '🌫️',
};

const TIER_COLOR: Record<Tier, string> = {
  sunny:  '#10E0A8',
  mostly: '#4ADE80',
  partly: '#FBBF24',
  cloudy: '#FB923C',
  rain:   '#F87171',
  storm:  '#F43F5E',
  fog:    '#64748B',
};

const TIER_LABEL: Record<Tier, string> = {
  sunny:  'Sunny',
  mostly: 'Mostly sunny',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  rain:   'Rain',
  storm:  'Storm',
  fog:    'Fog (no signal)',
};

/* Severity 0 = best, 6 = worst — used to sort the advisories panel. */
const TIER_SEVERITY: Record<Tier, number> = {
  sunny: 0, mostly: 1, partly: 2, cloudy: 3, rain: 4, storm: 5, fog: 6,
};

/* Weather-zone bubble around each station — radius in meters, fill opacity.
   Overlapping bubbles blend into "weather fronts" on the map. */
const ZONE_RADIUS: Record<Tier, number> = {
  sunny:    650_000,
  mostly:   780_000,
  partly:   950_000,
  cloudy: 1_150_000,
  rain:   1_350_000,
  storm:  1_600_000,
  fog:      450_000,
};

const ZONE_FILL_OPACITY: Record<Tier, number> = {
  sunny:  0.14,
  mostly: 0.17,
  partly: 0.22,
  cloudy: 0.27,
  rain:   0.34,
  storm:  0.42,
  fog:    0.07,
};

const tierOf = (s: StationState): Tier => {
  const total = s.ok + s.fail;
  if (total === 0) return 'fog';
  const loss = s.fail / total;
  if (loss > 0.5) return 'storm';
  if (s.samples.length === 0) return 'fog';

  const med = median(s.samples);
  const jit = jitter(s.samples);

  if (med > 400 || loss > 0.20) return 'storm';
  if (loss > 0.05) return 'rain';
  if (med > 250) return 'cloudy';
  if (med > 120 || jit > 25) return 'partly';
  if (med > 60) return 'mostly';
  return 'sunny';
};

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const dot = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(34,211,238,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(34,211,238,0);   }
  100% { box-shadow: 0 0 0 0   rgba(34,211,238,0);   }
`;

/* ─────────────────────────────────────────────────────────────────
   Page chrome
   ───────────────────────────────────────────────────────────────── */
const Page = styled.div`
  position: fixed; inset: 0; background: #06070C; overflow: hidden;
`;

const MapWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;
  .leaflet-container {
    width: 100%; height: 100%;
    background: #06070C;
    font-family: 'Inter', sans-serif;
  }
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
  .leaflet-tooltip.weather-tip {
    background: rgba(6, 7, 12, 0.92);
    border: 1px solid rgba(34, 211, 238, 0.35);
    border-radius: 10px;
    color: ${theme.colors.text};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    padding: 0.55rem 0.7rem;
    backdrop-filter: blur(10px);
    .lbl { color: ${theme.colors.textMuted}; }
    b { color: ${theme.colors.primary}; }
    &::before { display: none; }
  }
`;

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

const ControlBtn = styled.button<{ $primary?: boolean }>`
  height: 38px; padding: 0 0.95rem;
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

const Probing = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.75rem;
  color: ${theme.colors.textSecondary};
  margin-left: auto;
  display: flex; align-items: center; gap: 0.5rem;
  b { color: ${theme.colors.primary}; font-weight: 700; }
  @media (max-width: 560px) {
    width: 100%; order: 10; margin-left: 0;
  }
`;

const PulseDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${theme.colors.primary};
  animation: ${dot} 1.4s ease-out infinite;
`;

const StatsBar = styled.div`
  position: absolute;
  top: calc(clamp(5.5rem, 8vh, 7rem) + 70px);
  left: 0; right: 0; margin: 0 auto;
  z-index: 999;
  display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center;
  width: min(1200px, calc(100% - 1rem));
  pointer-events: none;
  animation: ${fadeIn} 0.4s ease-out 0.1s both;
`;

const Stat = styled.div<{ $tier?: Tier }>`
  font-size: 0.72rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${p => p.$tier ? TIER_COLOR[p.$tier] + '66' : theme.colors.border};
  background: rgba(6, 7, 12, 0.7);
  backdrop-filter: blur(10px);
  color: ${p => p.$tier ? TIER_COLOR[p.$tier] : theme.colors.textSecondary};
  pointer-events: auto;
  b { color: ${theme.colors.text}; font-weight: 700; }
`;

const SidePanel = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  right: 1rem; bottom: 1rem;
  z-index: 1000;
  width: min(360px, calc(100% - 2rem));
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

const StationRow = styled.button<{ $active: boolean; $tier: Tier }>`
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 0.55rem; align-items: center;
  width: 100%; padding: 0.5rem 1rem;
  background: ${p => p.$active ? 'rgba(34,211,238,0.08)' : 'transparent'};
  border: none;
  border-left: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  text-align: left; cursor: pointer; color: inherit;
  transition: background 150ms;
  &:hover { background: rgba(34,211,238,0.05); }

  .glyph { font-size: 18px; line-height: 1; text-align: center; }
  .body { min-width: 0; }
  .name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.82rem; color: ${theme.colors.text};
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .meta {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.66rem; color: ${theme.colors.textMuted};
    margin-top: 0.1rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lat {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem; font-weight: 700;
    color: ${p => TIER_COLOR[p.$tier]};
    text-align: right;
    white-space: nowrap;
  }
`;

const Legend = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  z-index: 999;
  display: flex; flex-wrap: wrap; gap: 0.35rem;
  background: rgba(6, 7, 12, 0.78);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  padding: 0.4rem 0.55rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  max-width: min(420px, calc(100% - 2rem));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  color: ${theme.colors.textMuted};
  @media (max-width: 720px) {
    left: 0.5rem; right: 0.5rem; max-width: none;
  }
`;

const LegendItem = styled.span<{ $tier: Tier }>`
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  border: 1px solid ${p => TIER_COLOR[p.$tier]}55;
  color: ${p => TIER_COLOR[p.$tier]};
`;

/* ─────────────────────────────────────────────────────────────────
   Leaflet marker — colored chip with weather glyph + latency label.
   Active station gets an expanding pulse ring underneath.
   ───────────────────────────────────────────────────────────────── */
const ensureStyle = () => {
  if (document.getElementById('wt-weather-style')) return;
  const s = document.createElement('style');
  s.id = 'wt-weather-style';
  s.textContent = `
    @keyframes wt-weather-pulse {
      0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.85; }
      100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0;    }
    }
    @keyframes wt-storm-dash {
      to { stroke-dashoffset: -28; }
    }
    @keyframes wt-zone-breathe {
      0%, 100% { opacity: 1;    }
      50%      { opacity: 0.78; }
    }
    .wt-weather-icon { background: transparent !important; border: none !important; }
    .wt-weather-zone { transition: fill 600ms ease, fill-opacity 600ms ease; }
    .wt-rain-zone, .wt-storm-zone { animation: wt-zone-breathe 3.2s ease-in-out infinite; }
    .wt-storm-ring { stroke-dasharray: 6 6; animation: wt-storm-dash 1.8s linear infinite; }
  `;
  document.head.appendChild(s);
};

const buildMarker = (tier: Tier, latest: number | null, active: boolean) => {
  const color = TIER_COLOR[tier];
  const ring = active
    ? `<span style="position:absolute; left:50%; top:18px; width:30px; height:30px;
          border-radius:50%; border:1.5px solid ${color};
          animation: wt-weather-pulse 1.6s ease-out infinite; z-index:0;"></span>`
    : '';
  return L.divIcon({
    className: 'wt-weather-icon',
    html: `
      <div style="position:relative; width:64px; height:64px; transform:translate(-50%, -100%);">
        ${ring}
        <div style="position:relative; z-index:1;
            width:34px; height:34px; margin:0 auto;
            border-radius:50%;
            background:rgba(6,7,12,0.88);
            border:1.5px solid ${color};
            box-shadow:0 0 14px ${color}99;
            display:flex; align-items:center; justify-content:center;
            font-size:18px; line-height:1;">
          ${TIER_GLYPH[tier]}
        </div>
        <div style="position:relative; z-index:1;
            margin:4px auto 0;
            width:max-content; max-width:60px;
            padding:1px 5px;
            font-family:'JetBrains Mono', ui-monospace, monospace;
            font-size:0.6rem; font-weight:700;
            color:${color};
            background:rgba(6,7,12,0.88);
            border:1px solid rgba(255,255,255,0.08);
            border-radius:4px;
            text-align:center; white-space:nowrap;">
          ${latest != null ? latest + ' ms' : '—'}
        </div>
      </div>
    `,
    iconSize: [64, 64],
    iconAnchor: [0, 0],
  });
};

const FitOnce: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.fitWorld({ padding: [40, 40] });
  }, [map]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const WeatherMap: React.FC = () => {
  const [cells, setCells] = useState<Record<string, StationState>>(() => {
    const init: Record<string, StationState> = {};
    STATIONS.forEach(s => { init[s.host] = EMPTY; });
    return init;
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 720 : true
  );

  const idxRef = useRef(0);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureStyle(); }, []);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const i = idxRef.current;
      const st = STATIONS[i];
      setActiveIdx(i);

      networkApi.ping(st.host)
        .then(res => {
          setCells(prev => {
            const old = prev[st.host] ?? EMPTY;
            const samples = res.latencyMs != null && res.reachable
              ? [...old.samples, res.latencyMs].slice(-HISTORY)
              : old.samples;
            return {
              ...prev,
              [st.host]: {
                samples,
                latest: res.latencyMs,
                reachable: res.reachable,
                lastUpdated: Date.now(),
                ok:   old.ok   + (res.reachable ? 1 : 0),
                fail: old.fail + (res.reachable ? 0 : 1),
              },
            };
          });
        })
        .catch(() => {
          setCells(prev => {
            const old = prev[st.host] ?? EMPTY;
            return {
              ...prev,
              [st.host]: { ...old, latest: null, reachable: false, lastUpdated: Date.now(), fail: old.fail + 1 },
            };
          });
        });

      const next = (i + 1) % STATIONS.length;
      idxRef.current = next;
      if (next === 0) setCycle(c => c + 1);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  /* Derived per-station tier */
  const tiered = useMemo(
    () => STATIONS.map(s => ({ station: s, state: cells[s.host] ?? EMPTY, tier: tierOf(cells[s.host] ?? EMPTY) })),
    [cells]
  );

  /* Global summary stats */
  const summary = useMemo(() => {
    const counts: Record<Tier, number> = { sunny:0, mostly:0, partly:0, cloudy:0, rain:0, storm:0, fog:0 };
    let lats: number[] = [];
    let okN = 0, failN = 0;
    for (const t of tiered) {
      counts[t.tier]++;
      okN += t.state.ok; failN += t.state.fail;
      if (t.state.latest != null && t.state.reachable) lats.push(t.state.latest);
    }
    return {
      counts,
      medianLat: lats.length ? median(lats) : null,
      total: okN + failN,
      okPct: okN + failN > 0 ? Math.round((okN / (okN + failN)) * 100) : 0,
    };
  }, [tiered]);

  /* Sorted by worst weather first for the side advisory list */
  const advisories = useMemo(
    () => [...tiered].sort((a, b) => TIER_SEVERITY[b.tier] - TIER_SEVERITY[a.tier]),
    [tiered]
  );

  const activeHost = activeIdx != null ? STATIONS[activeIdx] : null;

  const focusStation = (s: Station) => {
    mapRef.current?.flyTo([s.lat, s.lon], 4, { duration: 1 });
  };

  return (
    <Page>
      <MapWrap ref={mapWrapRef}>
        <MapContainer
          center={[20, 0]} zoom={2} minZoom={2} maxZoom={8} worldCopyJump
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
          <FitOnce />

          {/* Translucent tier-colored bubbles around each station — overlapping
              bubbles blend into "weather fronts".  Sits below the markers. */}
          {tiered.map(({ station, tier }) => (
            <Circle
              key={`zone-${station.host}`}
              center={[station.lat, station.lon]}
              radius={ZONE_RADIUS[tier]}
              pathOptions={{
                color: TIER_COLOR[tier],
                weight: 0,
                opacity: 0,
                fillColor: TIER_COLOR[tier],
                fillOpacity: ZONE_FILL_OPACITY[tier],
                className: `wt-${tier}-zone wt-weather-zone`,
              }}
              interactive={false}
            />
          ))}

          {/* Animated dashed rings on severe-weather stations */}
          {tiered
            .filter(t => t.tier === 'rain' || t.tier === 'storm')
            .map(({ station, tier }) => (
              <Circle
                key={`ring-${station.host}`}
                center={[station.lat, station.lon]}
                radius={ZONE_RADIUS[tier] * 0.62}
                pathOptions={{
                  color: TIER_COLOR[tier],
                  weight: 1.5,
                  opacity: 0.85,
                  fill: false,
                  className: 'wt-storm-ring',
                }}
                interactive={false}
              />
            ))}

          {tiered.map(({ station, state, tier }, i) => (
            <Marker
              key={station.host}
              position={[station.lat, station.lon]}
              icon={buildMarker(tier, state.latest, !paused && activeIdx === i)}
              eventHandlers={{ click: () => focusStation(station) }}
            >
              <Tooltip className="weather-tip" direction="top" offset={[0, -56]} opacity={1}>
                <div><b>{station.label}</b> · {TIER_LABEL[tier]}</div>
                <div className="lbl">{station.city}</div>
                <div className="lbl">
                  {state.latest != null ? `${state.latest} ms · ` : ''}
                  median {median(state.samples) || '—'} ms · jitter {jitter(state.samples)} ms
                </div>
                <div className="lbl">
                  {state.ok + state.fail > 0
                    ? `loss ${Math.round((state.fail / (state.ok + state.fail)) * 100)}% over ${state.ok + state.fail} probes`
                    : 'waiting for first probe'}
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </MapWrap>

      <TopBar>
        <VisualizeTabs />
        <ControlBtn $primary={paused} onClick={() => setPaused(p => !p)}>
          {paused ? '▶ Resume' : '❚❚ Pause'}
        </ControlBtn>
        <Probing>
          {!paused && <PulseDot />}
          {activeHost
            ? <>probing <b>{activeHost.host}</b> · cycle {cycle + 1} · {summary.total} probes</>
            : <>idle</>}
        </Probing>
        <DownloadButton
          getTarget={() => mapWrapRef.current?.querySelector<HTMLElement>('.leaflet-container') ?? null}
          filename="network-weather"
          disabled={summary.total === 0}
          title="Download weather map as PNG"
        />
      </TopBar>

      <StatsBar>
        {summary.counts.sunny + summary.counts.mostly > 0 && (
          <Stat $tier="sunny">
            <b>{summary.counts.sunny + summary.counts.mostly}</b>&nbsp;sunny
          </Stat>
        )}
        {summary.counts.partly + summary.counts.cloudy > 0 && (
          <Stat $tier="cloudy">
            <b>{summary.counts.partly + summary.counts.cloudy}</b>&nbsp;cloudy
          </Stat>
        )}
        {summary.counts.rain > 0 && (
          <Stat $tier="rain"><b>{summary.counts.rain}</b>&nbsp;rain</Stat>
        )}
        {summary.counts.storm > 0 && (
          <Stat $tier="storm"><b>{summary.counts.storm}</b>&nbsp;storm</Stat>
        )}
        {summary.counts.fog > 0 && (
          <Stat $tier="fog"><b>{summary.counts.fog}</b>&nbsp;fog</Stat>
        )}
        {summary.medianLat != null && (
          <Stat><b>{summary.medianLat}</b>&nbsp;ms median</Stat>
        )}
        {summary.total > 0 && (
          <Stat><b>{summary.okPct}%</b>&nbsp;reachable</Stat>
        )}
      </StatsBar>

      <PanelOpenButton $visible={!panelOpen} onClick={() => setPanelOpen(true)}>
        Advisories →
      </PanelOpenButton>

      <SidePanel $open={panelOpen}>
        <PanelHeader>
          <PanelTitle>
            Weather report<span>{STATIONS.length} stations</span>
          </PanelTitle>
          <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
        </PanelHeader>

        <ScrollList>
          <Section>Advisories (worst first)</Section>
          {advisories.map(({ station, state, tier }) => {
            const total = state.ok + state.fail;
            const loss = total > 0 ? Math.round((state.fail / total) * 100) : 0;
            const isActive = activeHost?.host === station.host;
            return (
              <StationRow
                key={station.host}
                $active={isActive}
                $tier={tier}
                onClick={() => focusStation(station)}
              >
                <span className="glyph">{TIER_GLYPH[tier]}</span>
                <div className="body">
                  <div className="name">{station.label} · {station.city}</div>
                  <div className="meta">
                    {TIER_LABEL[tier]}
                    {state.samples.length > 1 && ` · jitter ${jitter(state.samples)} ms`}
                    {loss > 0 && ` · loss ${loss}%`}
                  </div>
                </div>
                <div className="lat">
                  {state.latest != null ? `${state.latest} ms` : '—'}
                </div>
              </StationRow>
            );
          })}
        </ScrollList>
      </SidePanel>

      <Legend>
        <LegendItem $tier="sunny">☀️ &lt;60 ms</LegendItem>
        <LegendItem $tier="mostly">🌤️ &lt;120 ms</LegendItem>
        <LegendItem $tier="partly">⛅ &lt;250 ms</LegendItem>
        <LegendItem $tier="cloudy">☁️ &lt;400 ms</LegendItem>
        <LegendItem $tier="rain">🌧️ loss</LegendItem>
        <LegendItem $tier="storm">⛈️ severe</LegendItem>
        <LegendItem $tier="fog">🌫️ no signal</LegendItem>
      </Legend>
    </Page>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────── */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function jitter(arr: number[]): number {
  if (arr.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < arr.length; i++) sum += Math.abs(arr[i] - arr[i - 1]);
  return Math.round(sum / (arr.length - 1));
}
