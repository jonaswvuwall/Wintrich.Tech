import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { type Map as LeafletMap, type CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { networkApi } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { DownloadButton } from '../components/DownloadButton';

/* ─────────────────────────────────────────────────────────────────
   Submarine Cables — schematic map of major intercontinental
   subsea cables.  Each cable continuously flows with a dashed
   stroke (always-on animation).  In the background we rotate
   through landing-city hosts and ping each; the result modulates
   the flow speed and color of every cable touching that endpoint.

   Coordinates are deliberately schematic — paths are simplified
   to a handful of waypoints that follow the real great-circle
   approximations without bumping continents.  Trans-Pacific
   routes are expressed in extended-west longitudes and rendered
   twice so they're visible regardless of pan direction.
   ───────────────────────────────────────────────────────────────── */

interface Endpoint {
  id: string;
  host: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
}

interface Cable {
  id: string;
  name: string;
  year: number;
  km: number;
  endpoints: [string, string];
  path: [number, number][];
}

const ENDPOINTS: Endpoint[] = [
  { id: 'us-east',      host: 'github.com',         label: 'GitHub',       city: 'Ashburn, US',     lat:  37.50, lon:  -75.98 },
  { id: 'us-west-la',   host: 'netflix.com',        label: 'Netflix',      city: 'Los Angeles, US', lat:  33.91, lon: -118.41 },
  { id: 'us-west-or',   host: 'aws.amazon.com',     label: 'AWS Oregon',   city: 'Bandon, US',      lat:  43.12, lon: -124.41 },
  { id: 'uk',           host: 'bbc.co.uk',          label: 'BBC',          city: 'Bude, UK',        lat:  50.83, lon:   -4.55 },
  { id: 'ireland',      host: 'rte.ie',             label: 'RTÉ',          city: 'Galway, IE',      lat:  53.27, lon:   -9.06 },
  { id: 'france',       host: 'lemonde.fr',         label: 'Le Monde',     city: 'Marseille, FR',   lat:  43.30, lon:    5.37 },
  { id: 'spain',        host: 'elpais.com',         label: 'El País',      city: 'Bilbao, ES',      lat:  43.26, lon:   -2.92 },
  { id: 'portugal',     host: 'publico.pt',         label: 'Público',      city: 'Sines, PT',       lat:  37.95, lon:   -8.87 },
  { id: 'iceland',      host: 'ruv.is',             label: 'RÚV',          city: 'Þorlákshöfn, IS', lat:  63.85, lon:  -21.36 },
  { id: 'south-africa', host: 'news24.com',         label: 'News24',       city: 'Cape Town, ZA',   lat: -33.92, lon:   18.42 },
  { id: 'nigeria',      host: 'punchng.com',        label: 'Punch',        city: 'Lagos, NG',       lat:   6.45, lon:    3.40 },
  { id: 'india',        host: 'flipkart.com',       label: 'Flipkart',     city: 'Mumbai, IN',      lat:  19.08, lon:   72.88 },
  { id: 'singapore',    host: 'shopee.sg',          label: 'Shopee',       city: 'Tuas, SG',        lat:   1.30, lon:  103.62 },
  { id: 'hong-kong',    host: 'scmp.com',           label: 'SCMP',         city: 'Hong Kong, HK',   lat:  22.32, lon:  114.27 },
  { id: 'japan',        host: 'rakuten.co.jp',      label: 'Rakuten',      city: 'Maruyama, JP',    lat:  35.13, lon:  140.36 },
  { id: 'china',        host: 'baidu.com',          label: 'Baidu',        city: 'Chongming, CN',   lat:  31.62, lon:  121.86 },
  { id: 'taiwan',       host: 'cwa.gov.tw',         label: 'CWA',          city: 'Toucheng, TW',    lat:  24.83, lon:  121.84 },
  { id: 'australia',    host: 'abc.net.au',         label: 'ABC',          city: 'Sydney, AU',      lat: -33.87, lon:  151.21 },
  { id: 'new-zealand',  host: 'stuff.co.nz',        label: 'Stuff',        city: 'Auckland, NZ',    lat: -36.85, lon:  174.76 },
  { id: 'hawaii',       host: 'staradvertiser.com', label: 'Star-Advert.', city: 'Honolulu, US',    lat:  21.47, lon: -158.20 },
  { id: 'brazil',       host: 'globo.com',          label: 'Globo',        city: 'Fortaleza, BR',   lat:  -3.71, lon:  -38.53 },
  { id: 'chile',        host: 'emol.com',           label: 'EMOL',         city: 'Valparaíso, CL',  lat: -33.05, lon:  -71.62 },
];

/* Trans-Pacific paths use extended-west longitudes (all lons ≤ 0,
   continuous through the Pacific) so polylines don't snap across
   the antimeridian.  expandPath() below renders them in both worlds. */
const CABLES: Cable[] = [
  { id: 'marea',         name: 'MAREA',                year: 2018, km:  6605, endpoints: ['us-east', 'spain'],
    path: [[36.85, -75.98], [40, -65], [43, -30], [43, -10], [43.26, -2.92]] },
  { id: 'grace-hopper',  name: 'Grace Hopper',         year: 2022, km:  6300, endpoints: ['us-east', 'uk'],
    path: [[40.71, -74.01], [45, -50], [50, -25], [50.83, -4.55]] },
  { id: 'dunant',        name: 'Dunant',               year: 2021, km:  6600, endpoints: ['us-east', 'france'],
    path: [[36.85, -75.98], [42, -55], [46, -25], [46.71, -1.94], [43.30, 5.37]] },
  { id: 'havfrue',       name: 'HAVFRUE / AEC-2',      year: 2020, km:  7200, endpoints: ['us-east', 'ireland'],
    path: [[40.05, -74.05], [50, -30], [53.27, -9.06]] },
  { id: 'iris',          name: 'IRIS',                 year: 2022, km:  1700, endpoints: ['ireland', 'iceland'],
    path: [[53.27, -9.06], [58, -15], [63.85, -21.36]] },
  { id: 'ella-link',     name: 'EllaLink',             year: 2021, km:  6200, endpoints: ['portugal', 'brazil'],
    path: [[37.95, -8.87], [20, -25], [0, -32], [-3.71, -38.53]] },
  { id: 'brusa',         name: 'BRUSA',                year: 2018, km: 11000, endpoints: ['us-east', 'brazil'],
    path: [[36.85, -75.98], [25, -65], [10, -50], [-3.71, -38.53]] },
  { id: 'equiano',       name: 'Equiano',              year: 2023, km: 15000, endpoints: ['portugal', 'south-africa'],
    path: [[37.95, -8.87], [25, -15], [10, -2], [6.45, 3.40], [-15, 3], [-33.92, 18.42]] },
  { id: 'smw6',          name: 'SEA-ME-WE 6',          year: 2025, km: 19200, endpoints: ['france', 'singapore'],
    path: [[43.30, 5.37], [37, 15], [33, 28], [31.27, 32.30], [20, 38], [13, 43], [12, 55], [19.08, 72.88], [5, 90], [1.30, 103.62]] },
  { id: 'aae1',          name: 'AAE-1',                year: 2017, km: 25000, endpoints: ['hong-kong', 'france'],
    path: [[22.32, 114.27], [15, 112], [5, 105], [1.30, 103.62], [7, 82], [19.08, 72.88], [10, 60], [12, 52], [13, 43], [20, 38], [31.27, 32.30], [37, 15], [43.30, 5.37]] },
  { id: 'indigo-west',   name: 'Indigo-West',          year: 2019, km:  4600, endpoints: ['australia', 'singapore'],
    path: [[-31.95, 115.86], [-15, 110], [-5, 108], [1.30, 103.62]] },
  // Trans-Pacific — extended-west longitudes.
  { id: 'faster',        name: 'FASTER',               year: 2016, km:  9000, endpoints: ['us-west-or', 'japan'],
    path: [[43.12, -124.41], [40, -150], [40, -180], [40, -200], [35.13, -219.64]] },
  { id: 'ncp',           name: 'New Cross Pacific',    year: 2018, km: 13000, endpoints: ['us-west-or', 'china'],
    path: [[45.52, -122.99], [42, -160], [40, -185], [35, -210], [31.62, -238.14]] },
  { id: 'jupiter',       name: 'JUPITER',              year: 2020, km: 14000, endpoints: ['us-west-la', 'japan'],
    path: [[33.91, -118.41], [25, -150], [25, -180], [28, -205], [35.13, -219.64]] },
  { id: 'curie',         name: 'Curie',                year: 2019, km: 10500, endpoints: ['us-west-la', 'chile'],
    path: [[33.91, -118.41], [10, -105], [-15, -85], [-33.05, -71.62]] },
  { id: 'hawaiki',       name: 'Hawaiki',              year: 2018, km: 15000, endpoints: ['australia', 'hawaii'],
    path: [[-33.87, -208.79], [-15, -190], [5, -180], [15, -170], [21.47, -158.20]] },
  { id: 'sx-next',       name: 'Southern Cross NEXT',  year: 2022, km: 13700, endpoints: ['australia', 'us-west-la'],
    path: [[-33.87, -208.79], [-36.85, -185.24], [-20, -165], [0, -145], [15, -130], [33.91, -118.41]] },
  { id: 'plcn',          name: 'Pacific Light Cable',  year: 2020, km: 12800, endpoints: ['taiwan', 'us-west-la'],
    path: [[24.83, -238.16], [22, -220], [20, -195], [20, -170], [22, -150], [33.91, -118.41]] },
  { id: 'topaz',         name: 'Topaz',                year: 2024, km: 10000, endpoints: ['japan', 'us-west-or'],
    path: [[35.13, -219.64], [40, -210], [45, -180], [50, -150], [49.23, -124.83]] },
];

const TICK_MS = 5000;
const HISTORY = 16;

/* ─────────────────────────────────────────────────────────────────
   Per-endpoint rolling state and derived health tier
   ───────────────────────────────────────────────────────────────── */
interface EndpointState {
  samples: number[];
  latest: number | null;
  reachable: boolean;
  lastUpdated: number;
  ok: number;
  fail: number;
}

const EMPTY: EndpointState = {
  samples: [], latest: null, reachable: false,
  lastUpdated: 0, ok: 0, fail: 0,
};

type Tier = 'unknown' | 'fast' | 'good' | 'mid' | 'slow' | 'lossy' | 'dead';

const TIER_COLOR: Record<Tier, string> = {
  unknown: '#64748B',
  fast:    '#10E0A8',
  good:    '#4ADE80',
  mid:     '#FBBF24',
  slow:    '#FB923C',
  lossy:   '#F87171',
  dead:    '#F43F5E',
};

const TIER_LABEL: Record<Tier, string> = {
  unknown: 'Probing',
  fast:    'Excellent',
  good:    'Healthy',
  mid:     'Moderate',
  slow:    'Slow',
  lossy:   'Lossy',
  dead:    'Down',
};

/* Tier severity (worst first) for sorting the cable list. */
const TIER_RANK: Record<Tier, number> = {
  dead: 0, lossy: 1, slow: 2, mid: 3, good: 4, fast: 5, unknown: 6,
};

const tierOf = (s: EndpointState): Tier => {
  const total = s.ok + s.fail;
  if (total === 0) return 'unknown';
  const loss = s.fail / total;
  if (loss > 0.5) return 'dead';
  if (loss > 0.1) return 'lossy';
  if (s.samples.length === 0) return 'unknown';
  const med = median(s.samples);
  if (med > 400) return 'slow';
  if (med > 200) return 'mid';
  if (med > 80) return 'good';
  return 'fast';
};

/* Cable tier is the worse of its two endpoint tiers. */
const cableTier = (a: Tier, b: Tier): Tier =>
  TIER_RANK[a] < TIER_RANK[b] ? a : b;

/* Render trans-Pacific paths in both worlds so they're visible
   regardless of pan direction. */
const expandPath = (path: [number, number][]): [number, number][][] => {
  const minLon = Math.min(...path.map(p => p[1]));
  if (minLon < -180) {
    return [path, path.map(([la, lo]) => [la, lo + 360])];
  }
  return [path];
};

/* ─────────────────────────────────────────────────────────────────
   Packet comets — discrete bright dots fired on each successful
   probe, riding their cables from the far landing to the just-
   probed landing.  Layered on top of the ambient stroke flow.
   ───────────────────────────────────────────────────────────────── */
interface Comet {
  id: string;
  positions: [number, number][];
  startedAt: number;
  duration: number;
  color: string;
  reverse: boolean;
}

/* Tier for *this* probe sample only — colours the comet without
   dragging the rolling state of the endpoint into the picture. */
const instantTier = (latencyMs: number | null): Tier => {
  if (latencyMs == null) return 'unknown';
  if (latencyMs > 400) return 'slow';
  if (latencyMs > 200) return 'mid';
  if (latencyMs > 80)  return 'good';
  return 'fast';
};

/* Piecewise-linear interpolation along a polyline path, t ∈ [0,1].
   Euclidean lengths on lat/lon are good enough for our schematic
   cables — they don't need true great-circle parameterisation. */
function interpolatePath(path: [number, number][], t: number): [number, number] {
  if (path.length < 2) return path[0];
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return path[0];
  const target = t * total;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target) {
      const s = segs[i] === 0 ? 0 : (target - acc) / segs[i];
      const a = path[i], b = path[i + 1];
      return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
    }
    acc += segs[i];
  }
  return path[path.length - 1];
}

/* One comet = one CircleMarker that updates its position via rAF
   and tears itself down when its lifetime expires.  Position
   updates go through the Leaflet instance directly to avoid React
   re-renders at 60 fps. */
const CometMarker: React.FC<{ comet: Comet }> = ({ comet }) => {
  const ref = useRef<LeafletCircleMarker | null>(null);
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - comet.startedAt) / comet.duration);
      const u = comet.reverse ? 1 - t : t;
      const pos = interpolatePath(comet.positions, u);
      const m = ref.current;
      if (m) {
        m.setLatLng([pos[0], pos[1]]);
        // Ramp opacity in/out so the comet doesn't snap on or off.
        const fade = t < 0.1 ? t * 10 : t > 0.9 ? (1 - t) * 10 : 1;
        m.setStyle({ opacity: fade, fillOpacity: fade });
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [comet]);

  const start = comet.reverse
    ? comet.positions[comet.positions.length - 1]
    : comet.positions[0];

  return (
    <CircleMarker
      ref={ref}
      center={[start[0], start[1]]}
      radius={4.5}
      pathOptions={{
        color: '#FFFFFF',
        weight: 1.2,
        opacity: 1,
        fillColor: comet.color,
        fillOpacity: 1,
        className: 'wt-comet',
      }}
      interactive={false}
    />
  );
};

/* ─────────────────────────────────────────────────────────────────
   Animations & global SVG/CSS injected into the document head.
   Leaflet renders polylines as <path> elements, so animating
   stroke-dashoffset gives us the continuous "pulse flow" effect.
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const dot = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(34,211,238,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(34,211,238,0);   }
  100% { box-shadow: 0 0 0 0   rgba(34,211,238,0);    }
`;

const ensureStyle = () => {
  if (document.getElementById('wt-cable-style')) return;
  const s = document.createElement('style');
  s.id = 'wt-cable-style';
  s.textContent = `
    @keyframes wt-cable-flow {
      from { stroke-dashoffset: 0;   }
      to   { stroke-dashoffset: -36; }
    }
    @keyframes wt-cable-flow-rev {
      from { stroke-dashoffset: 0;  }
      to   { stroke-dashoffset: 36; }
    }
    @keyframes wt-landing-pulse {
      0%   { r: 5;  opacity: 0.85; }
      100% { r: 22; opacity: 0;    }
    }
    @keyframes wt-active-ring {
      0%, 100% { r: 9;  opacity: 0.9; }
      50%      { r: 14; opacity: 0.4; }
    }

    /* Static dim base layer for each cable */
    .wt-cable-base {
      stroke-linecap: round;
    }

    /* Animated bright flow layer */
    .wt-cable-flow {
      stroke-linecap: round;
      stroke-dasharray: 4 14;
      animation-name: wt-cable-flow;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      will-change: stroke-dashoffset;
    }
    .wt-cable-flow.wt-rev { animation-name: wt-cable-flow-rev; }

    .wt-flow-unknown { animation-duration: 8s;    }
    .wt-flow-fast    { animation-duration: 2.6s;  }
    .wt-flow-good    { animation-duration: 3.8s;  }
    .wt-flow-mid     { animation-duration: 6s;    }
    .wt-flow-slow    { animation-duration: 11s;   }
    .wt-flow-lossy   { animation-duration: 18s;   stroke-dasharray: 2 22; }
    .wt-flow-dead    { animation: none; opacity: 0.18 !important; stroke-dasharray: 2 18; }

    /* Highlighted cable (mouse hover) */
    .wt-cable-flow.wt-hot { filter: drop-shadow(0 0 6px currentColor); }

    /* Landing point pulse (background expanding ring on all landings) */
    .wt-landing-ring {
      animation: wt-landing-pulse 2.6s ease-out infinite;
      transform-origin: center;
    }
    /* Slightly stagger the per-landing rings */
    .wt-landing-ring-1 { animation-delay: 0.4s; }
    .wt-landing-ring-2 { animation-delay: 0.8s; }
    .wt-landing-ring-3 { animation-delay: 1.2s; }
    .wt-landing-ring-4 { animation-delay: 1.6s; }

    /* The endpoint currently being probed gets a tight cyan pulse */
    .wt-landing-active {
      animation: wt-active-ring 1.4s ease-in-out infinite;
    }

    /* Packet comets — bright dot with a soft white glow so they
       pop against the ambient cable flow regardless of tier hue. */
    .wt-comet {
      pointer-events: none;
      filter:
        drop-shadow(0 0 4px rgba(255, 255, 255, 0.65))
        drop-shadow(0 0 10px rgba(255, 255, 255, 0.35));
    }

    .leaflet-tooltip.cable-tip {
      background: rgba(6, 7, 12, 0.92);
      border: 1px solid rgba(34, 211, 238, 0.35);
      border-radius: 10px;
      color: #F4F4F5;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.72rem;
      padding: 0.55rem 0.7rem;
      backdrop-filter: blur(10px);
      .lbl { color: #94A3B8; }
      b { color: #22D3EE; }
      &::before { display: none; }
    }
  `;
  document.head.appendChild(s);
};

/* ─────────────────────────────────────────────────────────────────
   Page chrome — same visual idiom as the Weather Map for cohesion.
   ───────────────────────────────────────────────────────────────── */
const Page = styled.div`
  position: fixed; inset: 0; background: #06070C; overflow: hidden;
`;

const MapWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;
  .leaflet-container {
    width: 100%; height: 100%;
    background: #050810;
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

const CableRow = styled.button<{ $active: boolean; $tier: Tier }>`
  display: grid;
  grid-template-columns: 8px 1fr auto;
  gap: 0.6rem; align-items: center;
  width: 100%; padding: 0.5rem 1rem;
  background: ${p => p.$active ? 'rgba(34,211,238,0.08)' : 'transparent'};
  border: none;
  border-left: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  text-align: left; cursor: pointer; color: inherit;
  transition: background 150ms;
  &:hover { background: rgba(34,211,238,0.05); }

  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: ${p => TIER_COLOR[p.$tier]};
    box-shadow: 0 0 8px ${p => TIER_COLOR[p.$tier]}88;
  }
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
  .tier {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.7rem; font-weight: 700;
    color: ${p => TIER_COLOR[p.$tier]};
    text-align: right; white-space: nowrap;
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
  max-width: min(460px, calc(100% - 2rem));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  color: ${theme.colors.textMuted};
  @media (max-width: 720px) {
    left: 0.5rem; right: 0.5rem; max-width: none;
  }
`;

const LegendItem = styled.span<{ $tier: Tier }>`
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid ${p => TIER_COLOR[p.$tier]}55;
  color: ${p => TIER_COLOR[p.$tier]};
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: ${p => TIER_COLOR[p.$tier]};
    box-shadow: 0 0 6px ${p => TIER_COLOR[p.$tier]}aa;
  }
`;

const FitWorld: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    // Atlantic-biased framing at zoom 3 — high enough that the world
    // tiles fill a desktop viewport without black bars, low enough
    // that most Atlantic cables fit on screen at first paint.
    map.setView([20, -40], 3);
    // Leaflet sometimes mounts before its container has settled into
    // its final size, which is why the map looks "weirdly scaled"
    // until the first user interaction.  Re-measure on the next two
    // frames to be sure (covers font-loading / scrollbar reflows).
    requestAnimationFrame(() => {
      map.invalidateSize();
      requestAnimationFrame(() => map.invalidateSize());
    });
  }, [map]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   Page component
   ───────────────────────────────────────────────────────────────── */
export const SubmarineCables: React.FC = () => {
  const [cells, setCells] = useState<Record<string, EndpointState>>(() => {
    const init: Record<string, EndpointState> = {};
    ENDPOINTS.forEach(e => { init[e.id] = EMPTY; });
    return init;
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [hoverCable, setHoverCable] = useState<string | null>(null);
  const [comets, setComets] = useState<Comet[]>([]);
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 720 : true
  );

  /* Spawn one comet per cable touching the just-probed endpoint
     (one extra copy for Pacific cables, since their paths render
     in both worlds).  Comet *arrives* at the probed endpoint. */
  const spawnComets = (endpointId: string, latencyMs: number) => {
    const tier = instantTier(latencyMs);
    const duration = Math.max(2200, Math.min(8000, 1800 + latencyMs * 4));
    const color = TIER_COLOR[tier];
    const now = performance.now();
    const next: Comet[] = [];
    for (const cable of CABLES) {
      if (!cable.endpoints.includes(endpointId)) continue;
      const reverse = cable.endpoints[0] === endpointId;
      expandPath(cable.path).forEach((segs, copyIdx) => {
        next.push({
          id: `${cable.id}-${copyIdx}-${now}-${Math.random().toString(36).slice(2, 7)}`,
          positions: segs,
          startedAt: now,
          duration,
          color,
          reverse,
        });
      });
    }
    if (next.length === 0) return;
    setComets(prev => {
      const combined = [...prev, ...next];
      // Hard cap so long sessions can't leak.
      return combined.length > 80 ? combined.slice(combined.length - 80) : combined;
    });
  };

  /* Reap finished comets so the list (and the React tree) stays small. */
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setComets(prev => prev.filter(c => now - c.startedAt < c.duration + 200));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const idxRef = useRef(0);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureStyle(); }, []);

  /* Rotating probe loop. */
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const i = idxRef.current;
      const e = ENDPOINTS[i];
      setActiveIdx(i);

      networkApi.ping(e.host)
        .then(res => {
          setCells(prev => {
            const old = prev[e.id] ?? EMPTY;
            const samples = res.latencyMs != null && res.reachable
              ? [...old.samples, res.latencyMs].slice(-HISTORY)
              : old.samples;
            return {
              ...prev,
              [e.id]: {
                samples,
                latest: res.latencyMs,
                reachable: res.reachable,
                lastUpdated: Date.now(),
                ok:   old.ok   + (res.reachable ? 1 : 0),
                fail: old.fail + (res.reachable ? 0 : 1),
              },
            };
          });
          // Visible "packet just arrived" — only on reachable probes.
          if (res.reachable && res.latencyMs != null) {
            spawnComets(e.id, res.latencyMs);
          }
        })
        .catch(() => {
          setCells(prev => {
            const old = prev[e.id] ?? EMPTY;
            return {
              ...prev,
              [e.id]: { ...old, latest: null, reachable: false, lastUpdated: Date.now(), fail: old.fail + 1 },
            };
          });
        });

      const next = (i + 1) % ENDPOINTS.length;
      idxRef.current = next;
      if (next === 0) setCycle(c => c + 1);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  /* Derived per-endpoint tier. */
  const endpointTier = useMemo(() => {
    const t: Record<string, Tier> = {};
    for (const e of ENDPOINTS) t[e.id] = tierOf(cells[e.id] ?? EMPTY);
    return t;
  }, [cells]);

  /* Tier per cable = worse of two endpoint tiers. */
  const cableTiered = useMemo(
    () => CABLES.map(c => ({
      cable: c,
      tier: cableTier(endpointTier[c.endpoints[0]] ?? 'unknown', endpointTier[c.endpoints[1]] ?? 'unknown'),
    })),
    [endpointTier]
  );

  /* Global summary. */
  const summary = useMemo(() => {
    const counts: Record<Tier, number> = { unknown:0, fast:0, good:0, mid:0, slow:0, lossy:0, dead:0 };
    let lats: number[] = [];
    let okN = 0, failN = 0;
    for (const e of ENDPOINTS) {
      const s = cells[e.id] ?? EMPTY;
      okN += s.ok; failN += s.fail;
      if (s.latest != null && s.reachable) lats.push(s.latest);
    }
    for (const { tier } of cableTiered) counts[tier]++;
    return {
      counts,
      medianLat: lats.length ? median(lats) : null,
      total: okN + failN,
      okPct: okN + failN > 0 ? Math.round((okN / (okN + failN)) * 100) : 0,
    };
  }, [cells, cableTiered]);

  /* Cable list sorted by severity (worst first). */
  const cableList = useMemo(
    () => [...cableTiered].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]),
    [cableTiered]
  );

  const activeEndpoint = activeIdx != null ? ENDPOINTS[activeIdx] : null;

  const focusCable = (c: Cable) => {
    // Pan to the midpoint of the cable's path.
    const mid = c.path[Math.floor(c.path.length / 2)];
    let lon = mid[1];
    // Normalize back to displayable range if the cable was expressed in extended-west form.
    while (lon < -180) lon += 360;
    while (lon >  180) lon -= 360;
    mapRef.current?.flyTo([mid[0], lon], 3, { duration: 1 });
  };

  return (
    <Page>
      <MapWrap ref={mapWrapRef}>
        <MapContainer
          center={[20, -40]} zoom={3} minZoom={2} maxZoom={6} worldCopyJump
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
          <FitWorld />

          {/* ── Cables ── one entry per expanded copy (Pacific routes
              are rendered in both worlds so pan direction doesn't
              matter).  Two visual layers: a faint static base plus
              an animated dashed overlay whose speed + color reflect
              the cable's current health tier. */}
          {cableTiered.map(({ cable, tier }) =>
            expandPath(cable.path).map((segs, copyIdx) => {
              const positions = segs.map(([la, lo]) => [la, lo] as [number, number]);
              const color = TIER_COLOR[tier];
              const isHot = hoverCable === cable.id;
              return (
                <React.Fragment key={`${cable.id}-${copyIdx}`}>
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color,
                      weight: 1,
                      opacity: 0.20,
                      className: 'wt-cable-base',
                    }}
                    interactive={false}
                  />
                  <Polyline
                    key={`flow-${cable.id}-${copyIdx}-${tier}`}
                    positions={positions}
                    pathOptions={{
                      color,
                      weight: isHot ? 3 : 2,
                      opacity: tier === 'dead' ? 0.5 : 0.95,
                      className: `wt-cable-flow wt-flow-${tier}${isHot ? ' wt-hot' : ''}`,
                    }}
                    eventHandlers={{
                      mouseover: () => setHoverCable(cable.id),
                      mouseout: () => setHoverCable(null),
                      click: () => focusCable(cable),
                    }}
                  >
                    <Tooltip className="cable-tip" direction="top" sticky opacity={1}>
                      <div><b>{cable.name}</b> · {TIER_LABEL[tier]}</div>
                      <div className="lbl">
                        {ENDPOINTS.find(e => e.id === cable.endpoints[0])?.city}
                        {' ↔ '}
                        {ENDPOINTS.find(e => e.id === cable.endpoints[1])?.city}
                      </div>
                      <div className="lbl">
                        {cable.km.toLocaleString()} km · in service since {cable.year}
                      </div>
                    </Tooltip>
                  </Polyline>
                </React.Fragment>
              );
            })
          )}

          {/* ── Landing points ── small dots with a continuous expanding
              ring underneath.  The endpoint currently being probed
              gets a tighter, brighter cyan pulse. */}
          {ENDPOINTS.map((e, i) => {
            const tier = endpointTier[e.id];
            const isActive = !paused && activeIdx === i;
            const ringClass = `wt-landing-ring wt-landing-ring-${i % 5}`;
            return (
              <React.Fragment key={e.id}>
                {/* Outer expanding ring — pure visual ambience. */}
                <CircleMarker
                  center={[e.lat, e.lon]}
                  radius={5}
                  pathOptions={{
                    color: TIER_COLOR[tier],
                    weight: 1,
                    opacity: 0.6,
                    fillOpacity: 0,
                    className: ringClass,
                  }}
                  interactive={false}
                />
                {/* Hard center dot — what you click on. */}
                <CircleMarker
                  center={[e.lat, e.lon]}
                  radius={4}
                  pathOptions={{
                    color: TIER_COLOR[tier],
                    weight: 1.5,
                    opacity: 1,
                    fillColor: '#06070C',
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => mapRef.current?.flyTo([e.lat, e.lon], 4, { duration: 0.8 }),
                  }}
                >
                  <Tooltip className="cable-tip" direction="top" offset={[0, -6]} opacity={1}>
                    <div><b>{e.label}</b> · {TIER_LABEL[tier]}</div>
                    <div className="lbl">{e.city} · {e.host}</div>
                    <div className="lbl">
                      {(cells[e.id]?.latest != null)
                        ? `${cells[e.id]!.latest} ms · median ${median(cells[e.id]!.samples) || '—'} ms`
                        : 'waiting for first probe'}
                    </div>
                  </Tooltip>
                </CircleMarker>
                {/* Active-probe pulse — only on the currently-firing endpoint. */}
                {isActive && (
                  <CircleMarker
                    center={[e.lat, e.lon]}
                    radius={9}
                    pathOptions={{
                      color: theme.colors.primary,
                      weight: 1.5,
                      opacity: 1,
                      fillOpacity: 0,
                      className: 'wt-landing-active',
                    }}
                    interactive={false}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* ── Packet comets ── one bright dot per cable touching
              the just-probed endpoint, riding the cable from the
              far landing to the probed landing. */}
          {comets.map(c => <CometMarker key={c.id} comet={c} />)}
        </MapContainer>
      </MapWrap>

      <TopBar>
        <VisualizeTabs />
        <ControlBtn $primary={paused} onClick={() => setPaused(p => !p)}>
          {paused ? '▶ Resume' : '❚❚ Pause'}
        </ControlBtn>
        <Probing>
          {!paused && <PulseDot />}
          {activeEndpoint ? (
            <span className="host" title={activeEndpoint.host}>{activeEndpoint.host}</span>
          ) : (
            <span className="idle">idle</span>
          )}
          <span className="stats">
            {activeEndpoint ? `c${cycle + 1} · ${summary.total}` : 'press resume'}
          </span>
        </Probing>
        <DownloadButton
          getTarget={() => mapWrapRef.current?.querySelector<HTMLElement>('.leaflet-container') ?? null}
          filename="submarine-cables"
          disabled={summary.total === 0}
          title="Download cable map as PNG"
        />
      </TopBar>

      <StatsBar>
        <Stat>
          <b>{CABLES.length}</b>&nbsp;cables
        </Stat>
        <Stat>
          <b>{ENDPOINTS.length}</b>&nbsp;landings
        </Stat>
        {summary.counts.fast + summary.counts.good > 0 && (
          <Stat $tier="good">
            <b>{summary.counts.fast + summary.counts.good}</b>&nbsp;healthy
          </Stat>
        )}
        {summary.counts.mid > 0 && (
          <Stat $tier="mid"><b>{summary.counts.mid}</b>&nbsp;moderate</Stat>
        )}
        {summary.counts.slow > 0 && (
          <Stat $tier="slow"><b>{summary.counts.slow}</b>&nbsp;slow</Stat>
        )}
        {summary.counts.lossy + summary.counts.dead > 0 && (
          <Stat $tier="lossy">
            <b>{summary.counts.lossy + summary.counts.dead}</b>&nbsp;impaired
          </Stat>
        )}
        {summary.medianLat != null && (
          <Stat><b>{summary.medianLat}</b>&nbsp;ms median</Stat>
        )}
        {summary.total > 0 && (
          <Stat><b>{summary.okPct}%</b>&nbsp;reachable</Stat>
        )}
      </StatsBar>

      <PanelOpenButton $visible={!panelOpen} onClick={() => setPanelOpen(true)}>
        Cables →
      </PanelOpenButton>

      <SidePanel $open={panelOpen}>
        <PanelHeader>
          <PanelTitle>
            Cable status<span>{CABLES.length} systems</span>
          </PanelTitle>
          <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
        </PanelHeader>

        <ScrollList>
          <Section>Worst conditions first</Section>
          {cableList.map(({ cable, tier }) => {
            const a = ENDPOINTS.find(e => e.id === cable.endpoints[0]);
            const b = ENDPOINTS.find(e => e.id === cable.endpoints[1]);
            const isActive = hoverCable === cable.id;
            return (
              <CableRow
                key={cable.id}
                $active={isActive}
                $tier={tier}
                onMouseEnter={() => setHoverCable(cable.id)}
                onMouseLeave={() => setHoverCable(null)}
                onClick={() => focusCable(cable)}
              >
                <span className="dot" />
                <div className="body">
                  <div className="name">{cable.name}</div>
                  <div className="meta">
                    {a?.city.split(',')[0]} ↔ {b?.city.split(',')[0]} · {cable.km.toLocaleString()} km
                  </div>
                </div>
                <div className="tier">{TIER_LABEL[tier]}</div>
              </CableRow>
            );
          })}
        </ScrollList>
      </SidePanel>

      <Legend>
        <LegendItem $tier="fast">fast &lt;80 ms</LegendItem>
        <LegendItem $tier="good">healthy &lt;200 ms</LegendItem>
        <LegendItem $tier="mid">moderate &lt;400 ms</LegendItem>
        <LegendItem $tier="slow">slow</LegendItem>
        <LegendItem $tier="lossy">lossy</LegendItem>
        <LegendItem $tier="dead">down</LegendItem>
        <LegendItem $tier="unknown">probing</LegendItem>
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
