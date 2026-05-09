import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L, { type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { networkApi, type TracerouteResponse, type TracerouteHop } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { Button, Input, LoadingSpinner } from '../components/StyledComponents';
import { TraceIcon } from '../components/common/ToolIcons';
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────────── */
const dashFlow = keyframes`
  to { stroke-dashoffset: -40; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─────────────────────────────────────────────────────────────────
   Page chrome — full-bleed map, glassy floating overlays
   ───────────────────────────────────────────────────────────────── */

const Page = styled.div`
  position: fixed;
  inset: 0;
  background: #06070C;
  overflow: hidden;
`;

const MapWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  .leaflet-container {
    width: 100%;
    height: 100%;
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
    background: rgba(6, 7, 12, 0.7);
    backdrop-filter: blur(10px);
    a {
      background: transparent !important;
      color: ${theme.colors.text} !important;
      border-bottom: 1px solid ${theme.colors.border} !important;
      &:hover { background: rgba(34, 211, 238, 0.15) !important; }
    }
  }

  /* The path animation — applied via className to <Polyline /> */
  .trace-line {
    stroke: #22D3EE;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-dasharray: 8 6;
    filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
    animation: ${dashFlow} 1.4s linear infinite;
  }
  .trace-line-glow {
    stroke: #7C9CFF;
    stroke-width: 6;
    stroke-linecap: round;
    opacity: 0.18;
    filter: blur(2px);
  }

  .leaflet-tooltip.hop-tooltip {
    background: rgba(6, 7, 12, 0.92);
    border: 1px solid rgba(34, 211, 238, 0.4);
    border-radius: 10px;
    color: ${theme.colors.text};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    padding: 0.55rem 0.7rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
    .lbl { color: ${theme.colors.textMuted}; }
    b { color: ${theme.colors.primary}; }
    &::before { display: none; }
  }
`;

/* Top floating bar */
const TopBar = styled.header`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: min(900px, calc(100% - 1rem));
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
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity: 0.5;
    pointer-events: none;
  }

  @media (max-width: 560px) {
    top: clamp(4.5rem, 7vh, 5.5rem);
    padding: 0.55rem 0.6rem;
    gap: 0.4rem;
  }
`;

const TitleBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-right: 0.75rem;
  border-right: 1px solid ${theme.colors.border};
  flex-shrink: 0;

  @media (max-width: 720px) {
    padding-right: 0.5rem;
    .subtitle { display: none; }
  }
  @media (max-width: 480px) {
    padding-right: 0.4rem;
    .label { display: none; }
  }
`;

const TitleIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${theme.gradients.brandSoft};
  border: 1px solid rgba(34, 211, 238, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary};
  flex-shrink: 0;
  svg { width: 18px; height: 18px; stroke-width: 1.8; }
`;

const Title = styled.h1`
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.colors.text};
  white-space: nowrap;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  .subtitle { color: ${theme.colors.textMuted}; font-weight: 400; font-size: 0.8rem; }
`;

const InputCell = styled.div`
  flex: 1 1 200px;
  min-width: 0;
  input {
    margin: 0;
    height: 38px;
    padding: 0 0.85rem;
    font-size: 0.85rem;
  }
  @media (max-width: 480px) {
    input { font-size: 0.8rem; padding: 0 0.6rem; }
  }
`;

const RunBtn = styled(Button)`
  width: auto;
  min-width: 110px;
  height: 38px;
  padding: 0 1.1rem;
  font-size: 0.85rem;
  border-radius: 10px;
  flex-shrink: 0;
  @media (max-width: 480px) {
    min-width: 0;
    padding: 0 0.85rem;
    font-size: 0.8rem;
  }
`;

/* Stats row under top bar */
const StatsBar = styled.div`
  position: absolute;
  top: calc(clamp(5.5rem, 8vh, 7rem) + 78px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  width: min(900px, calc(100% - 1rem));
  pointer-events: none;
  animation: ${fadeIn} 0.6s ease-out 0.1s both;

  @media (max-width: 560px) {
    top: calc(clamp(4.5rem, 7vh, 5.5rem) + 70px);
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
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: ${theme.colors.error};
  padding: 0.7rem 1.2rem;
  border-radius: 12px;
  backdrop-filter: blur(12px);
  font-size: 0.85rem;
  max-width: 90%;
`;

/* Right-side hops panel — desktop drawer / mobile bottom sheet */
const SidePanel = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
  width: min(380px, calc(100% - 2rem));
  display: flex;
  flex-direction: column;
  background: rgba(6, 7, 12, 0.82);
  border: 1px solid ${theme.colors.border};
  border-radius: 18px;
  backdrop-filter: blur(20px) saturate(140%);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  transition: transform 300ms ease, opacity 300ms ease;
  transform: translateX(0);
  opacity: 1;
  ${p => !p.$open && css`
    transform: translateX(calc(100% + 1.5rem));
    opacity: 0;
    pointer-events: none;
  `}

  @media (max-width: 720px) {
    top: auto;
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-height: 60vh;
    border-radius: 18px 18px 0 0;
    border-bottom: none;
    transform: translateY(0);
    ${p => !p.$open && css`
      transform: translateY(calc(100% + 1rem));
    `}
  }
`;

const Grabber = styled.div`
  display: none;
  @media (max-width: 720px) {
    display: block;
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.18);
    margin: 0.45rem auto 0;
  }
`;

const PanelHeader = styled.div`
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  color: ${theme.colors.text};
  span {
    color: ${theme.colors.textMuted};
    font-weight: 400;
    margin-left: 0.4rem;
    font-size: 0.78rem;
  }
`;

const PanelToggle = styled.button`
  background: transparent;
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  border-radius: 8px;
  font-size: 0.7rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  &:hover { color: ${theme.colors.primary}; border-color: rgba(34, 211, 238, 0.4); }
`;

const PanelOpenButton = styled.button<{ $visible: boolean }>`
  position: absolute;
  top: clamp(5.5rem, 8vh, 7rem);
  right: 1rem;
  z-index: 999;
  background: rgba(6, 7, 12, 0.82);
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.text};
  padding: 0.55rem 0.85rem;
  border-radius: 12px;
  font-size: 0.78rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  display: ${p => p.$visible ? 'block' : 'none'};
  transition: border-color 200ms;
  &:hover { border-color: rgba(34, 211, 238, 0.5); }

  @media (max-width: 720px) {
    top: auto;
    right: 1rem;
    bottom: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
`;

const HopsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 3px; }
`;

const HopRow = styled.button<{ $active: boolean; $clickable: boolean }>`
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 0.6rem;
  align-items: center;
  width: 100%;
  padding: 0.55rem 1rem;
  background: ${p => p.$active ? 'rgba(34,211,238,0.08)' : 'transparent'};
  border: none;
  border-left: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  text-align: left;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};
  color: inherit;
  transition: background 150ms;

  &:hover { background: ${p => p.$clickable ? 'rgba(34,211,238,0.05)' : 'transparent'}; }
`;

const HopNumLbl = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
  text-align: right;
`;

const HopBody = styled.div`
  min-width: 0;
`;

const HopHost = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HopMeta = styled.div`
  font-size: 0.66rem;
  color: ${theme.colors.textMuted};
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Latency = styled.div<{ $tone: 'ok' | 'warn' | 'fail' | 'none' }>`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${p =>
    p.$tone === 'ok' ? theme.colors.success
    : p.$tone === 'warn' ? theme.colors.warning
    : p.$tone === 'fail' ? theme.colors.error
    : theme.colors.textMuted};
  white-space: nowrap;
`;

const Flag = styled.span`
  margin-right: 0.4rem;
  font-size: 0.85rem;
  line-height: 1;
`;

const EmptyHint = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${theme.colors.textMuted};
  font-size: 0.85rem;
  line-height: 1.5;
  small {
    display: block;
    font-size: 0.72rem;
    margin-top: 0.4rem;
    color: ${theme.colors.textMuted};
    opacity: 0.7;
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────── */
const flagFromCC = (cc: string | null): string => {
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

/* Custom DivIcon factory: glowing circle with animated pulse halo */
const buildHopIcon = (opts: { isDest: boolean; hopNum: number }) => {
  const color = opts.isDest ? '#A78BFA' : '#22D3EE';
  const glow = opts.isDest ? 'rgba(167,139,250,0.85)' : 'rgba(34,211,238,0.85)';
  const size = opts.isDest ? 18 : 14;
  return L.divIcon({
    className: 'wt-hop-icon',
    html: `
      <div style="
        position: relative; width: ${size}px; height: ${size}px;
        transform: translate(-50%, -50%);
      ">
        <span style="
          position: absolute; inset: 0; border-radius: 50%;
          background: ${color}; box-shadow: 0 0 12px ${glow};
          border: 2px solid rgba(255,255,255,0.95);
          z-index: 2;
        "></span>
        <span style="
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid ${color};
          animation: wt-hop-pulse 2.4s ease-out infinite;
          z-index: 1;
        "></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });
};

/* Inject the keyframe globally once (Leaflet DivIcons live outside React's CSS) */
const ensurePulseStyle = () => {
  if (document.getElementById('wt-hop-pulse-style')) return;
  const style = document.createElement('style');
  style.id = 'wt-hop-pulse-style';
  style.textContent = `
    @keyframes wt-hop-pulse {
      0%   { transform: scale(1);   opacity: 0.9; }
      100% { transform: scale(2.6); opacity: 0;   }
    }
    .wt-hop-icon { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(style);
};

/* Helper component that re-fits the map view to the hop bounds */
const FitBounds: React.FC<{ points: LatLngExpression[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 5, { duration: 1.2 });
      return;
    }
    const bounds = L.latLngBounds(points as L.LatLngTuple[]);
    map.flyToBounds(bounds.pad(0.25), { duration: 1.2, maxZoom: 6 });
  }, [points, map]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const Traceroute: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TracerouteResponse | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 720 : true
  );
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => { ensurePulseStyle(); }, []);

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

  const plotted = useMemo(() => {
    if (!result) return [];
    return result.hops
      .filter(h => h.lat != null && h.lon != null)
      .map(h => ({ hop: h, pos: [h.lat as number, h.lon as number] as L.LatLngTuple }));
  }, [result]);

  const polylinePositions = useMemo(() => plotted.map(p => p.pos), [plotted]);

  const focusHop = (hop: TracerouteHop) => {
    if (hop.lat == null || hop.lon == null) return;
    setHover(hop.hop);
    mapRef.current?.flyTo([hop.lat, hop.lon], 5, { duration: 1 });
  };

  return (
    <Page>
      <MapWrap>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={10}
          worldCopyJump
          ref={(m) => { mapRef.current = m as LeafletMap; }}
          attributionControl
          zoomControl
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />

          {polylinePositions.length >= 2 && (
            <>
              <Polyline positions={polylinePositions} pathOptions={{ className: 'trace-line-glow' }} />
              <Polyline positions={polylinePositions} pathOptions={{ className: 'trace-line' }} />
            </>
          )}

          {plotted.map((p, i) => {
            const isDest = i === plotted.length - 1;
            return (
              <Marker
                key={`m-${p.hop.hop}`}
                position={p.pos}
                icon={buildHopIcon({ isDest, hopNum: p.hop.hop })}
                eventHandlers={{
                  mouseover: () => setHover(p.hop.hop),
                  mouseout: () => setHover(h => (h === p.hop.hop ? null : h)),
                }}
              >
                <Tooltip
                  className="hop-tooltip"
                  direction="top"
                  offset={[0, -12]}
                  opacity={1}
                  permanent={hover === p.hop.hop}
                >
                  <div>
                    <Flag>{flagFromCC(p.hop.countryCode)}</Flag>
                    hop <b>{p.hop.hop}</b>
                    {p.hop.city ? ` · ${p.hop.city}` : p.hop.country ? ` · ${p.hop.country}` : ''}
                  </div>
                  <div className="lbl">{p.hop.hostname ?? p.hop.ip}</div>
                  {p.hop.asnName && <div className="lbl">{p.hop.asn} {p.hop.asnName}</div>}
                  {p.hop.latencyMs != null && <div className="lbl">{p.hop.latencyMs} ms</div>}
                </Tooltip>
              </Marker>
            );
          })}

          <FitBounds points={polylinePositions} />
        </MapContainer>
      </MapWrap>

      <TopBar>
        <TitleBlock>
          <TitleIcon><TraceIcon /></TitleIcon>
          <Title><span className="label">Traceroute</span><span className="subtitle">live network path</span></Title>
        </TitleBlock>
        <InputCell>
          <Input
            type="text"
            placeholder="example.com or 1.1.1.1"
            value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run(target)}
            disabled={loading}
          />
        </InputCell>
        <RunBtn onClick={() => run(target)} disabled={loading || !target.trim()}>
          {loading ? <LoadingSpinner /> : 'Trace path'}
        </RunBtn>
      </TopBar>

      {result && (
        <StatsBar>
          <Stat $tone={result.completed ? 'ok' : 'warn'}>
            <b>{result.completed ? 'reached' : 'partial'}</b>&nbsp;destination
          </Stat>
          <Stat><b>{result.hopCount}</b>&nbsp;hops</Stat>
          <Stat><b>{result.totalDurationMs}</b>&nbsp;ms</Stat>
          {result.destinationIp && <Stat>dest&nbsp;<b>{result.destinationIp}</b></Stat>}
          <Stat><b>{plotted.length}</b>&nbsp;geolocated</Stat>
        </StatsBar>
      )}

      <PanelOpenButton $visible={!!result && !panelOpen} onClick={() => setPanelOpen(true)}>
        Show hops →
      </PanelOpenButton>

      <SidePanel $open={!!result && panelOpen}>
        <Grabber onClick={() => setPanelOpen(false)} />
        <PanelHeader>
          <PanelTitle>
            Hops<span>{result?.hops.length ?? 0}</span>
          </PanelTitle>
          <PanelToggle onClick={() => setPanelOpen(false)}>Hide</PanelToggle>
        </PanelHeader>

        <HopsList>
          {!result && (
            <EmptyHint>
              Enter a host above and trace the path to see every router between you and the destination on a real map.
              <small>Hops are geolocated by IP and enriched with ASN ownership.</small>
            </EmptyHint>
          )}

          {result?.hops.map(h => {
            const tone = latencyTone(h.latencyMs);
            const clickable = h.lat != null && h.lon != null;
            return (
              <HopRow
                key={`row-${h.hop}`}
                $active={hover === h.hop}
                $clickable={clickable}
                onMouseEnter={() => setHover(h.hop)}
                onMouseLeave={() => setHover(prev => (prev === h.hop ? null : prev))}
                onClick={() => clickable && focusHop(h)}
                disabled={!clickable && !h.ip}
              >
                <HopNumLbl>{h.hop.toString().padStart(2, '0')}</HopNumLbl>
                <HopBody>
                  <HopHost>
                    <Flag>{flagFromCC(h.countryCode)}</Flag>
                    {h.hostname ?? h.ip ?? <span style={{ color: theme.colors.textMuted }}>* * *</span>}
                  </HopHost>
                  <HopMeta>
                    {h.city && <>{h.city}{h.country ? `, ${h.country}` : ''}</>}
                    {!h.city && h.country && <>{h.country}</>}
                    {!h.country && h.isPrivate && <>private network</>}
                    {!h.country && !h.isPrivate && h.asnName && <>{h.asnName}</>}
                    {!h.country && !h.isPrivate && !h.asnName && h.ip && <>{h.ip}</>}
                    {!h.ip && <>request timed out</>}
                  </HopMeta>
                </HopBody>
                <Latency $tone={tone}>{h.latencyMs != null ? `${h.latencyMs} ms` : '—'}</Latency>
              </HopRow>
            );
          })}
        </HopsList>
      </SidePanel>

      {result?.error && result.hops.length === 0 && <ErrorBanner>{result.error}</ErrorBanner>}

      <ScrollToTop />
    </Page>
  );
};
