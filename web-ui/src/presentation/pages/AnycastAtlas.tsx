import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L, { type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  networkApi,
  type AnycastAtlasResponse,
  type AnycastResolver,
  type AnycastEndpoint,
} from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { Button, Input, LoadingSpinner } from '../components/StyledComponents';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { DownloadButton } from '../components/DownloadButton';
import { InfoButton } from '../components/InfoButton';
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const dashFlow = keyframes`
  to { stroke-dashoffset: -32; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/* ─────────────────────────────────────────────────────────────────
   Page chrome
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
  .atlas-link {
    stroke-linecap: round;
    stroke-dasharray: 4 6;
    animation: ${dashFlow} 2s linear infinite;
  }
  .leaflet-tooltip.atlas-tooltip {
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
    &::before { display: none; }
  }
`;

const TopBar = styled.header`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 1000;
  width: min(1200px, calc(100% - 1rem));
  background: rgba(6, 7, 12, 0.78);
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  padding: 0.7rem 0.85rem;
  display: flex; align-items: center; gap: 0.6rem;
  backdrop-filter: blur(20px) saturate(140%);
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
  @media (max-width: 560px) {
    top: clamp(4.5rem, 7vh, 5.5rem);
    padding: 0.5rem 0.55rem;
    gap: 0.4rem;
    flex-wrap: wrap;
    width: calc(100% - 0.7rem);
    > nav { flex: 1 0 100%; justify-content: center; display: flex; }
  }
`;

const InputCell = styled.div`
  flex: 1 1 200px; min-width: 0;
  input { margin: 0; height: 38px; padding: 0 0.85rem; font-size: 0.85rem; }
  @media (max-width: 560px) {
    flex: 1 1 60%;
    input { font-size: 0.85rem; height: 36px; padding: 0 0.7rem; }
  }
`;

const RunBtn = styled(Button)`
  width: auto; min-width: 110px; height: 38px;
  padding: 0 1.1rem; font-size: 0.85rem; border-radius: 10px; flex-shrink: 0;
  @media (max-width: 560px) { min-width: 0; height: 36px; padding: 0 0.85rem; font-size: 0.8rem; }
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
  @media (max-width: 560px) {
    top: calc(clamp(4.5rem, 7vh, 5.5rem) + 100px);
    gap: 0.3rem;
    padding: 0 0.4rem;
  }
`;

const Stat = styled.div<{ $tone?: 'ok' | 'warn' | 'fail' }>`
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
  ${p => p.$tone === 'ok' && css`border-color: rgba(16,224,168,0.45); color: ${theme.colors.success};`}
  ${p => p.$tone === 'warn' && css`border-color: rgba(251,191,36,0.45); color: ${theme.colors.warning};`}
  ${p => p.$tone === 'fail' && css`border-color: rgba(244,63,94,0.45); color: ${theme.colors.error};`}
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
    width: 100%; max-height: 60vh;
    border-radius: 18px 18px 0 0; border-bottom: none;
    transform: translateY(0);
    ${p => !p.$open && css`transform: translateY(calc(100% + 1rem));`}
  }
`;

const Grabber = styled.div`
  display: none;
  @media (max-width: 720px) {
    display: block; width: 36px; height: 4px;
    border-radius: 2px; background: rgba(255, 255, 255, 0.18);
    margin: 0.45rem auto 0;
  }
`;

const PanelHeader = styled.div`
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${theme.colors.border};
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
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
  transition: border-color 200ms;
  &:hover { border-color: rgba(34, 211, 238, 0.5); }
  @media (max-width: 720px) {
    top: auto; right: 1rem; bottom: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
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

const ResolverRow = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 0.55rem; align-items: center;
  width: 100%; padding: 0.5rem 1rem;
  background: ${p => p.$active ? 'rgba(34,211,238,0.08)' : 'transparent'};
  border: none;
  border-left: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  text-align: left; cursor: pointer; color: inherit;
  transition: background 150ms;
  &:hover { background: rgba(34,211,238,0.05); }
`;

const Dot = styled.span<{ $color: string }>`
  width: 9px; height: 9px; border-radius: 50%;
  background: ${p => p.$color};
  box-shadow: 0 0 8px ${p => p.$color};
  justify-self: center;
`;

const RowBody = styled.div` min-width: 0; `;
const RowName = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem; color: ${theme.colors.text};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const RowMeta = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.66rem; color: ${theme.colors.textMuted};
  margin-top: 0.1rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const RowLat = styled.div<{ $tone: 'ok' | 'warn' | 'fail' | 'none' }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem; font-weight: 600;
  white-space: nowrap;
  color: ${p => p.$tone === 'ok' ? theme.colors.success
              : p.$tone === 'warn' ? theme.colors.warning
              : p.$tone === 'fail' ? theme.colors.error
              : theme.colors.textMuted};
`;

const EmptyHint = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${theme.colors.textMuted};
  font-size: 0.85rem; line-height: 1.5;
  small { display: block; font-size: 0.72rem; margin-top: 0.4rem; opacity: 0.7; }
`;

/* ─────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────── */
const flagFromCC = (cc: string | null | undefined): string => {
  if (!cc || cc.length !== 2) return '🌐';
  const cps = cc.toUpperCase().split('').map(c => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...cps);
};

const latencyTone = (ms: number | null): 'ok' | 'warn' | 'fail' | 'none' => {
  if (ms == null) return 'none';
  if (ms < 60) return 'ok';
  if (ms < 180) return 'warn';
  return 'fail';
};

/* Color palette to distinguish endpoint groups (by IP). 12 distinct hues. */
const ENDPOINT_PALETTE = [
  '#22D3EE', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#60A5FA',
  '#F87171', '#C084FC', '#FB923C', '#10E0A8', '#67E8F9', '#FACC15',
];

const buildResolverIcon = () => L.divIcon({
  className: 'wt-resolver-icon',
  html: `
    <div style="position: relative; width: 16px; height: 16px; transform: translate(-50%, -50%);">
      <span style="
        position: absolute; inset: 0; border-radius: 4px;
        background: rgba(255,255,255,0.95);
        box-shadow: 0 0 10px rgba(255,255,255,0.55);
        border: 1.5px solid #06070C;
        z-index: 2;
      "></span>
      <span style="
        position: absolute; inset: -6px; border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.35);
        animation: wt-atlas-pulse 2.6s ease-out infinite;
        z-index: 1;
      "></span>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [0, 0],
});

const buildEndpointIcon = (color: string) => L.divIcon({
  className: 'wt-endpoint-icon',
  html: `
    <div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%);">
      <span style="
        position: absolute; inset: 4px; border-radius: 50%;
        background: ${color}; box-shadow: 0 0 14px ${color};
        border: 2px solid rgba(255,255,255,0.95);
        z-index: 2;
      "></span>
      <span style="
        position: absolute; inset: 0; border-radius: 50%;
        border: 2px solid ${color};
        animation: wt-atlas-pulse 2.4s ease-out infinite;
        z-index: 1;
      "></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [0, 0],
});

const ensureAtlasStyle = () => {
  if (document.getElementById('wt-atlas-style')) return;
  const s = document.createElement('style');
  s.id = 'wt-atlas-style';
  s.textContent = `
    @keyframes wt-atlas-pulse {
      0%   { transform: scale(1);   opacity: 0.85; }
      100% { transform: scale(2.4); opacity: 0;    }
    }
    .wt-resolver-icon, .wt-endpoint-icon { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(s);
};

const FitBounds: React.FC<{ points: LatLngExpression[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.flyTo(points[0], 4, { duration: 1.2 }); return; }
    const bounds = L.latLngBounds(points as L.LatLngTuple[]);
    map.flyToBounds(bounds.pad(0.25), { duration: 1.2, maxZoom: 4 });
  }, [points, map]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const AnycastAtlas: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnycastAtlasResponse | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 720 : true
  );
  const mapRef = useRef<LeafletMap | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureAtlasStyle(); }, []);

  const run = async (host: string) => {
    const trimmed = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;
    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const data = await networkApi.anycastAtlas(trimmed);
      setResult(data);
    } catch (e) {
      setResult({
        host: trimmed,
        timestamp: new Date().toISOString(),
        totalDurationMs: 0,
        uniqueEndpoints: 0,
        resolverCount: 0,
        resolvers: [],
        endpoints: [],
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally { setLoading(false); }
  };

  /* Map of endpoint IP → color (stable order: by descending resolverCount). */
  const endpointColors = useMemo(() => {
    const map = new Map<string, string>();
    if (!result) return map;
    result.endpoints.forEach((e, i) => map.set(e.ip, ENDPOINT_PALETTE[i % ENDPOINT_PALETTE.length]));
    return map;
  }, [result]);

  /* Show every resolver as a vantage marker (even failures). */
  const plottedResolvers = useMemo(
    () => result?.resolvers ?? [],
    [result]
  );

  /* Endpoints with geo coordinates we can plot. */
  const plottedEndpoints = useMemo(
    () => result?.endpoints.filter(e => e.lat != null && e.lon != null) ?? [],
    [result]
  );

  /* Lines: resolver → each endpoint it returned (if endpoint has geo). */
  const links = useMemo(() => {
    if (!result) return [] as { from: [number, number]; to: [number, number]; color: string; key: string }[];
    const epMap = new Map(result.endpoints.map(e => [e.ip, e]));
    const out: { from: [number, number]; to: [number, number]; color: string; key: string }[] = [];
    for (const r of result.resolvers) {
      const ips = r.resolvedIps ?? [];
      for (const ip of ips) {
        const ep = epMap.get(ip);
        if (!ep || ep.lat == null || ep.lon == null) continue;
        out.push({
          from: [r.lat, r.lon],
          to: [ep.lat, ep.lon],
          color: endpointColors.get(ip) ?? '#22D3EE',
          key: `${r.ip}->${ip}`,
        });
      }
    }
    return out;
  }, [result, endpointColors]);

  const allPoints: LatLngExpression[] = useMemo(() => {
    const pts: LatLngExpression[] = [];
    plottedResolvers.forEach(r => pts.push([r.lat, r.lon]));
    plottedEndpoints.forEach(e => pts.push([e.lat as number, e.lon as number]));
    return pts;
  }, [plottedResolvers, plottedEndpoints]);

  const focusResolver = (r: AnycastResolver) => {
    setHover(r.ip);
    mapRef.current?.flyTo([r.lat, r.lon], 4, { duration: 1 });
  };

  const focusEndpoint = (e: AnycastEndpoint) => {
    if (e.lat == null || e.lon == null) return;
    setHover(e.ip);
    mapRef.current?.flyTo([e.lat, e.lon], 4, { duration: 1 });
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

          {links.map(l => (
            <Polyline
              key={l.key}
              positions={[l.from, l.to]}
              pathOptions={{
                className: 'atlas-link',
                color: l.color,
                weight: hover === l.key.split('->')[0] || hover === l.key.split('->')[1] ? 2.5 : 1.4,
                opacity: hover && hover !== l.key.split('->')[0] && hover !== l.key.split('->')[1] ? 0.18 : 0.7,
              }}
            />
          ))}

          {plottedResolvers.map(r => (
            <Marker
              key={`r-${r.ip}`}
              position={[r.lat, r.lon]}
              icon={buildResolverIcon()}
              eventHandlers={{
                mouseover: () => setHover(r.ip),
                mouseout: () => setHover(h => (h === r.ip ? null : h)),
                click: () => focusResolver(r),
              }}
            >
              <Tooltip className="atlas-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent={hover === r.ip}>
                <div><Flag>{flagFromCC(r.countryCode)}</Flag><b>{r.name}</b></div>
                <div className="lbl">{r.provider} · {r.ip}</div>
                {r.latencyMs != null && <div className="lbl">{r.latencyMs} ms</div>}
                <div className="lbl">{r.resolvedIps.length} A record(s)</div>
              </Tooltip>
            </Marker>
          ))}

          {plottedEndpoints.map(e => (
            <Marker
              key={`e-${e.ip}`}
              position={[e.lat as number, e.lon as number]}
              icon={buildEndpointIcon(endpointColors.get(e.ip) ?? '#22D3EE')}
              eventHandlers={{
                mouseover: () => setHover(e.ip),
                mouseout: () => setHover(h => (h === e.ip ? null : h)),
                click: () => focusEndpoint(e),
              }}
            >
              <Tooltip className="atlas-tooltip" direction="top" offset={[0, -12]} opacity={1} permanent={hover === e.ip}>
                <div><Flag>{flagFromCC(e.countryCode)}</Flag>endpoint <b>{e.ip}</b></div>
                {e.city && <div className="lbl">{e.city}{e.country ? `, ${e.country}` : ''}</div>}
                {e.asnName && <div className="lbl">{e.asn} {e.asnName}</div>}
                <div className="lbl">returned by {e.resolverCount} resolver(s)</div>
              </Tooltip>
            </Marker>
          ))}

          <FitBounds points={allPoints} />
        </MapContainer>
      </MapWrap>

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
          {loading ? <LoadingSpinner /> : 'Resolve'}
        </RunBtn>
        <InfoButton title="Anycast atlas">
          <p>
            Type a host and Resolve — the page calls <code>GET /api/network/anycast-atlas?host=…</code>.
            The backend queries the host's <b>A record from a constellation of public
            DNS resolvers</b> located in different cities, in parallel.
          </p>
          <p>
            Each resolver returns the IP it considers closest to <i>itself</i>. For an
            anycast CDN that's a different IP per region — the map draws lines from each
            resolver to its returned IP and groups them into <b>unique endpoints</b>.
          </p>
          <p>
            Endpoint IPs are enriched with <b>ASN + geo-coordinates</b> server-side, then
            plotted as anycast points-of-presence on the world map.
          </p>
        </InfoButton>
        <DownloadButton
          getTarget={() => mapWrapRef.current?.querySelector<HTMLElement>('.leaflet-container') ?? null}
          filename={`anycast-atlas-${result?.host ?? 'map'}`}
          disabled={loading || !result}
          title="Download anycast map as PNG"
        />
      </TopBar>

      {result && (
        <StatsBar>
          <Stat $tone={result.uniqueEndpoints > 1 ? 'ok' : 'warn'}>
            <b>{result.uniqueEndpoints}</b>&nbsp;unique IP{result.uniqueEndpoints !== 1 ? 's' : ''}
          </Stat>
          <Stat><b>{result.resolverCount}</b>/{result.resolvers.length}&nbsp;resolvers ok</Stat>
          <Stat><b>{result.totalDurationMs}</b>&nbsp;ms</Stat>
          {result.uniqueEndpoints > 1 && <Stat $tone="ok">anycast / GeoDNS detected</Stat>}
        </StatsBar>
      )}

      <PanelOpenButton $visible={!!result && !panelOpen} onClick={() => setPanelOpen(true)}>
        Show details →
      </PanelOpenButton>

      <SidePanel $open={!!result && panelOpen}>
        <Grabber onClick={() => setPanelOpen(false)} />
        <PanelHeader>
          <PanelTitle>
            Atlas<span>{result?.host}</span>
          </PanelTitle>
          <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
        </PanelHeader>

        <ScrollList>
          {!result && (
            <EmptyHint>
              Enter a host above to query 16 public DNS resolvers worldwide and reveal which
              endpoint each one returns — the fingerprint of anycast and GeoDNS.
              <small>Multiple endpoints = the host uses GeoDNS to steer traffic.</small>
            </EmptyHint>
          )}

          {result && result.endpoints.length > 0 && (
            <>
              <Section>Endpoints ({result.endpoints.length})</Section>
              {result.endpoints.map(e => (
                <ResolverRow
                  key={`er-${e.ip}`}
                  $active={hover === e.ip}
                  onMouseEnter={() => setHover(e.ip)}
                  onMouseLeave={() => setHover(h => (h === e.ip ? null : h))}
                  onClick={() => focusEndpoint(e)}
                >
                  <Dot $color={endpointColors.get(e.ip) ?? '#22D3EE'} />
                  <RowBody>
                    <RowName>{e.ip}</RowName>
                    <RowMeta>
                      {flagFromCC(e.countryCode)} {e.city ?? e.country ?? 'unlocated'}
                      {e.asnName ? ` · ${e.asnName}` : ''}
                    </RowMeta>
                  </RowBody>
                  <RowLat $tone="none">×{e.resolverCount}</RowLat>
                </ResolverRow>
              ))}
            </>
          )}

          {result && result.resolvers.length > 0 && (
            <>
              <Section>Resolvers</Section>
              {result.resolvers.map(r => {
                const tone = latencyTone(r.latencyMs);
                return (
                  <ResolverRow
                    key={`rr-${r.ip}`}
                    $active={hover === r.ip}
                    onMouseEnter={() => setHover(r.ip)}
                    onMouseLeave={() => setHover(h => (h === r.ip ? null : h))}
                    onClick={() => focusResolver(r)}
                  >
                    <Dot $color={r.error ? '#F43F5E' : '#FFFFFF'} />
                    <RowBody>
                      <RowName>{flagFromCC(r.countryCode)} {r.name}</RowName>
                      <RowMeta>
                        {r.error
                          ? r.error
                          : r.resolvedIps.length === 0
                            ? 'no records'
                            : r.resolvedIps.join(', ')}
                      </RowMeta>
                    </RowBody>
                    <RowLat $tone={tone}>{r.latencyMs != null ? `${r.latencyMs} ms` : '—'}</RowLat>
                  </ResolverRow>
                );
              })}
            </>
          )}
        </ScrollList>
      </SidePanel>

      {result?.error && result.endpoints.length === 0 && <ErrorBanner>{result.error}</ErrorBanner>}

      <ScrollToTop />
    </Page>
  );
};

const Flag = styled.span`
  margin-right: 0.4rem;
  font-size: 0.85rem;
  line-height: 1;
`;
