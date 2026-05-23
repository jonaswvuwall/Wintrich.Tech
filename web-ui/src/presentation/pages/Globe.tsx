import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { feature, mesh as topoMesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
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
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Constants & helpers
   ───────────────────────────────────────────────────────────────── */
const GLOBE_RADIUS = 1;
const ATMOSPHERE_RADIUS = 1.06;

/** Convert (lat, lon) in degrees to a unit-sphere (XYZ) position. */
const latLonToVec3 = (lat: number, lon: number, radius = GLOBE_RADIUS): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

/** Build a great-circle arc between two surface points, lifted into space at the midpoint. */
const buildArc = (from: THREE.Vector3, to: THREE.Vector3, samples = 80): THREE.Vector3[] => {
  const angle = from.angleTo(to);
  const arcLength = angle; // on unit sphere
  // Lift the midpoint proportionally to arc length: short hops barely lift, long hops arc high.
  const liftFactor = Math.min(0.55, 0.18 + arcLength * 0.22);

  const points: THREE.Vector3[] = [];
  const sinA = Math.sin(angle);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let p: THREE.Vector3;
    if (sinA < 1e-6) {
      p = from.clone().lerp(to, t);
    } else {
      // Spherical linear interpolation along the great circle
      const a = Math.sin((1 - t) * angle) / sinA;
      const b = Math.sin(t * angle) / sinA;
      p = from.clone().multiplyScalar(a).add(to.clone().multiplyScalar(b));
    }
    // Parabolic lift: sin(πt) peaks at t=0.5, multiplied by lift factor
    const lift = Math.sin(Math.PI * t) * liftFactor;
    p.normalize().multiplyScalar(GLOBE_RADIUS + lift);
    points.push(p);
  }
  return points;
};

/* Color packets/arcs by ASN ownership. */
const colorForAsn = (asnName: string | null): string => {
  if (!asnName) return '#22D3EE';
  const n = asnName.toLowerCase();
  if (n.includes('cloudflare')) return '#F38020';
  if (n.includes('google')) return '#EA4335';
  if (n.includes('amazon') || n.includes('aws')) return '#FF9900';
  if (n.includes('microsoft') || n.includes('azure')) return '#00A4EF';
  if (n.includes('hetzner')) return '#D50C2D';
  if (n.includes('ovh')) return '#123F6D';
  if (n.includes('digitalocean')) return '#0080FF';
  if (n.includes('akamai')) return '#0099CC';
  if (n.includes('fastly')) return '#FF282D';
  if (n.includes('linode')) return '#00A95C';
  if (n.includes('level 3') || n.includes('lumen') || n.includes('centurylink')) return '#A78BFA';
  if (n.includes('telia')) return '#990AE3';
  if (n.includes('hurricane')) return '#FBBF24';
  return '#22D3EE';
};

/* ─────────────────────────────────────────────────────────────────
   Earth — real NASA Blue Marble + topo bump, served from a CDN
   No rotation: beacons live in the same world space as the planet,
   so locking rotation keeps every hop pinned to its real coordinates.
   ───────────────────────────────────────────────────────────────── */
const EARTH_TEXTURE_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';
const EARTH_TOPO_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png';

const Earth: React.FC = () => {
  const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [EARTH_TEXTURE_URL, EARTH_TOPO_URL]);

  // Make sure colors are sRGB-correct
  if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
      <meshPhongMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        shininess={6}
        specular={new THREE.Color('#1a3a55')}
      />
    </mesh>
  );
};

/* Lightweight loading placeholder — solid sphere shown while textures stream in. */
const EarthPlaceholder: React.FC = () => (
  <mesh>
    <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
    <meshBasicMaterial color="#0A1633" />
  </mesh>
);

/* ─────────────────────────────────────────────────────────────────
   Country borders — thin glowing lines projected onto the sphere
   Source: world-atlas TopoJSON (Natural Earth 110m via unpkg).
   ───────────────────────────────────────────────────────────────── */
const BORDERS_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

/** Convert a (lon, lat) MultiLineString from TopoJSON into a flat positions buffer. */
const buildBorderGeometry = (topo: Topology): THREE.BufferGeometry => {
  // `mesh` returns the shared boundaries between countries as a MultiLineString.
  const objs = topo.objects as Record<string, GeometryCollection>;
  const countriesObj = objs.countries ?? objs[Object.keys(objs)[0]];
  const borders = topoMesh(topo, countriesObj, (a, b) => a !== b);
  const coastlines = feature(topo, countriesObj);

  const positions: number[] = [];
  const radius = GLOBE_RADIUS * 1.0015;

  const pushSegment = (lon1: number, lat1: number, lon2: number, lat2: number) => {
    const a = latLonToVec3(lat1, lon1, radius);
    const b = latLonToVec3(lat2, lon2, radius);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  const drawLine = (line: number[][]) => {
    for (let i = 0; i < line.length - 1; i++) {
      pushSegment(line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]);
    }
  };

  const walk = (geom: GeoJSON.Geometry) => {
    if (geom.type === 'LineString') drawLine(geom.coordinates);
    else if (geom.type === 'MultiLineString') geom.coordinates.forEach(drawLine);
    else if (geom.type === 'Polygon') geom.coordinates.forEach(drawLine);
    else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(drawLine));
    else if (geom.type === 'GeometryCollection') geom.geometries.forEach(walk);
  };

  walk(borders as GeoJSON.Geometry);
  // Add coastlines so islands without internal borders still appear.
  const cl = coastlines as GeoJSON.FeatureCollection | GeoJSON.Feature;
  if (cl.type === 'FeatureCollection') cl.features.forEach(f => f.geometry && walk(f.geometry));
  else if (cl.geometry) walk(cl.geometry);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geom;
};

const CountryBorders: React.FC = () => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(BORDERS_URL)
      .then(r => r.json() as Promise<Topology>)
      .then(topo => {
        if (cancelled) return;
        setGeometry(buildBorderGeometry(topo));
      })
      .catch(() => { /* silently skip if borders fail to load */ });
    return () => { cancelled = true; };
  }, []);
  if (!geometry) return null;
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#7DE7F5"
        transparent
        opacity={0.55}
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Atmosphere — fresnel glow halo around the planet
   ───────────────────────────────────────────────────────────────── */
const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    vec3 glow = vec3(0.13, 0.55, 0.95) * intensity;
    gl_FragColor = vec4(glow, intensity);
  }
`;

const Atmosphere: React.FC = () => (
  <mesh>
    <sphereGeometry args={[ATMOSPHERE_RADIUS, 64, 64]} />
    <shaderMaterial
      vertexShader={atmosphereVertex}
      fragmentShader={atmosphereFragment}
      blending={THREE.AdditiveBlending}
      side={THREE.BackSide}
      transparent
      depthWrite={false}
    />
  </mesh>
);

/* ─────────────────────────────────────────────────────────────────
   Hop beacon: glowing dot + slow pulsing halo
   ───────────────────────────────────────────────────────────────── */
const Beacon: React.FC<{
  position: THREE.Vector3;
  color: string;
  isDest?: boolean;
  label?: string;
  onHover?: (hovering: boolean) => void;
}> = ({ position, color, isDest, label, onHover }) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const lifted = position.clone().normalize().multiplyScalar(GLOBE_RADIUS + 0.005);
  const normal = position.clone().normalize();

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const t = (clock.elapsedTime * 0.7) % 1;
    const scale = 1 + t * 3;
    haloRef.current.scale.set(scale, scale, scale);
    (haloRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
  });

  return (
    <group position={lifted} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)}>
      {/* Core dot */}
      <mesh
        onPointerOver={() => onHover?.(true)}
        onPointerOut={() => onHover?.(false)}
      >
        <sphereGeometry args={[isDest ? 0.018 : 0.012, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Light pillar — short cylinder rising from the surface */}
      <mesh position={[0, 0, isDest ? 0.04 : 0.025]}>
        <cylinderGeometry args={[0.002, 0.002, isDest ? 0.08 : 0.05, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      {/* Pulsing halo ring */}
      <mesh ref={haloRef}>
        <ringGeometry args={[0.018, 0.022, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
      {label && (
        <Html
          position={[0, 0, 0.05]}
          center
          style={{
            color: color,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: '10px',
            background: 'rgba(6,7,12,0.85)',
            padding: '3px 6px',
            borderRadius: '6px',
            border: `1px solid ${color}55`,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {label}
        </Html>
      )}
    </group>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Animated arc — dashed line that draws itself in over time,
   with a packet sphere riding the leading edge
   ───────────────────────────────────────────────────────────────── */
const ArcSegment: React.FC<{
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  startDelay: number;     // seconds to wait before launching
  durationMs: number;     // animation duration in ms (longer = slower packet, drives latency feel)
}> = ({ from, to, color, startDelay, durationMs }) => {
  const points = useMemo(() => buildArc(from, to, 96), [from, to]);
  const packetRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const shockRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 used to slice the line

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    if (startTimeRef.current === null) startTimeRef.current = now + startDelay;
    const elapsed = now - startTimeRef.current;
    if (elapsed < 0) {
      // Hide packet until launch
      if (packetRef.current) packetRef.current.visible = false;
      return;
    }
    const t = Math.min(1, elapsed / (durationMs / 1000));
    setProgress(t);

    // Move packet along the arc
    if (packetRef.current && t < 1) {
      packetRef.current.visible = true;
      const idx = Math.floor(t * (points.length - 1));
      const p = points[idx];
      packetRef.current.position.copy(p);
      const pulse = 1 + Math.sin(now * 14) * 0.18;
      packetRef.current.scale.setScalar(pulse);
    } else if (packetRef.current && t >= 1) {
      packetRef.current.visible = false;
    }

    // Trail (faint glow following packet)
    if (trailRef.current && t < 1) {
      trailRef.current.visible = true;
      const trailIdx = Math.max(0, Math.floor((t - 0.04) * (points.length - 1)));
      trailRef.current.position.copy(points[trailIdx]);
      const pulse = 1.4 + Math.sin(now * 10) * 0.2;
      trailRef.current.scale.setScalar(pulse);
    } else if (trailRef.current) {
      trailRef.current.visible = false;
    }

    // Shockwave on arrival
    if (t >= 1 && !done) {
      setDone(true);
    }
    if (done && shockRef.current) {
      const sinceArrival = elapsed - durationMs / 1000;
      const dur = 0.6;
      const k = Math.min(1, sinceArrival / dur);
      if (k < 1) {
        shockRef.current.visible = true;
        const scale = 1 + k * 6;
        shockRef.current.scale.set(scale, scale, scale);
        (shockRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.6;
      } else {
        shockRef.current.visible = false;
      }
    }
  });

  // Slice the line up to current progress so it draws in
  const visiblePoints = useMemo(() => {
    if (progress <= 0) return [points[0], points[0]];
    const cut = Math.max(2, Math.floor(progress * points.length));
    return points.slice(0, cut);
  }, [points, progress]);

  // Faded "trail" of full path stays after arrival
  const arrivalNormal = to.clone().normalize();

  return (
    <group>
      {/* Live drawing line (bright) */}
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={1.8}
        transparent
        opacity={done ? 0.55 : 1}
        toneMapped={false}
      />
      {/* Glow underlay (full path, dim) — appears once arrived */}
      {done && (
        <Line
          points={points}
          color={color}
          lineWidth={5}
          transparent
          opacity={0.12}
          toneMapped={false}
        />
      )}
      {/* Packet */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Soft trail blob behind packet */}
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Shockwave at destination */}
      <mesh
        ref={shockRef}
        position={to.clone().normalize().multiplyScalar(GLOBE_RADIUS + 0.005)}
        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), arrivalNormal)}
        visible={false}
      >
        <ringGeometry args={[0.015, 0.022, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Scene: composes everything and runs the animation pipeline
   ───────────────────────────────────────────────────────────────── */
const Scene: React.FC<{
  hops: TracerouteHop[];
  setHover: (h: number | null) => void;
  hover: number | null;
}> = ({ hops, setHover, hover }) => {
  // Compute positions and arcs
  const plotted = useMemo(
    () => hops.filter(h => h.lat != null && h.lon != null),
    [hops],
  );

  const positions = useMemo(
    () => plotted.map(h => latLonToVec3(h.lat as number, h.lon as number)),
    [plotted],
  );

  const arcs = useMemo(() => {
    const list: { from: THREE.Vector3; to: THREE.Vector3; color: string; startDelay: number; durationMs: number; key: string }[] = [];
    let cumulativeDelay = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      const hop = plotted[i + 1];
      // Latency-driven duration: 60ms in real life ≈ 600ms animation; capped 200..2000ms
      const lat = hop.latencyMs ?? 50;
      const dur = Math.min(2000, Math.max(250, lat * 8));
      list.push({
        from: a, to: b,
        color: colorForAsn(hop.asnName),
        startDelay: cumulativeDelay,
        durationMs: dur,
        key: `arc-${i}`,
      });
      cumulativeDelay += dur / 1000 + 0.15;
    }
    return list;
  }, [positions, plotted]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={0.9} />
      <directionalLight position={[-5, -2, -3]} intensity={0.15} color="#7C9CFF" />
      <Stars radius={50} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />

      <React.Suspense fallback={<EarthPlaceholder />}>
        <Earth />
      </React.Suspense>
      <CountryBorders />
      <Atmosphere />

      {plotted.map((h, i) => (
        <Beacon
          key={`b-${h.hop}`}
          position={positions[i]}
          color={i === plotted.length - 1 ? '#A78BFA' : colorForAsn(h.asnName)}
          isDest={i === plotted.length - 1}
          label={hover === h.hop ? `${h.city ?? h.country ?? h.ip ?? '?'}` : undefined}
          onHover={(hovering) => setHover(hovering ? h.hop : null)}
        />
      ))}

      {arcs.map(a => (
        <ArcSegment
          key={a.key}
          from={a.from}
          to={a.to}
          color={a.color}
          startDelay={a.startDelay}
          durationMs={a.durationMs}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.6}
        maxDistance={6}
        target={[0, 0.5, 0]}
      />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Page chrome
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Page = styled.div`
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 50%, #0A0F1F 0%, #04060B 70%, #000 100%);
  overflow: hidden;
`;

const CanvasWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;
  canvas { display: block; }
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
    padding: 0.5rem 0.55rem; gap: 0.4rem;
    flex-wrap: wrap; width: calc(100% - 0.7rem);
    > nav { flex: 1 0 100%; justify-content: center; display: flex; }
  }
`;

const InputCell = styled.div`
  flex: 1 1 200px; min-width: 0;
  input { margin: 0; height: 38px; padding: 0 0.85rem; font-size: 0.85rem; }
  @media (max-width: 560px) { flex: 1 1 60%; input { height: 36px; padding: 0 0.7rem; } }
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
    gap: 0.3rem; padding: 0 0.4rem;
  }
`;

const Stat = styled.div`
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
`;

const Hint = styled.div`
  position: absolute;
  bottom: 1.2rem;
  left: 50%; transform: translateX(-50%);
  z-index: 999;
  background: rgba(6, 7, 12, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  padding: 0.55rem 0.95rem;
  color: ${theme.colors.textMuted};
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  text-align: center;
  pointer-events: none;
  animation: ${fadeIn} 0.6s ease-out 0.4s both;
  b { color: ${theme.colors.primary}; font-weight: 600; }
  @media (max-width: 560px) { font-size: 0.68rem; padding: 0.45rem 0.75rem; max-width: 92%; }
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
   Page
   ───────────────────────────────────────────────────────────────── */
export const Globe: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TracerouteResponse | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [runId, setRunId] = useState(0); // bumped each run to remount arcs and replay animation
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const run = async (host: string) => {
    const trimmed = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;
    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const data = await networkApi.traceroute(trimmed);
      setResult(data);
      setRunId(id => id + 1);
    } catch (e) {
      setResult({
        host: trimmed, destinationIp: null, completed: false,
        hopCount: 0, totalDurationMs: 0,
        timestamp: new Date().toISOString(), hops: [],
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally { setLoading(false); }
  };

  const plottedCount = result?.hops.filter(h => h.lat != null && h.lon != null).length ?? 0;

  return (
    <Page>
      <CanvasWrap ref={canvasWrapRef}>
        <Canvas
          camera={{ position: [0, 0.5, 3.2], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={['#04060B']} />
          <Scene
            key={runId /* remount to replay animation on each new trace */}
            hops={result?.hops ?? []}
            hover={hover}
            setHover={setHover}
          />
        </Canvas>
      </CanvasWrap>

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
          {loading ? <LoadingSpinner /> : 'Launch'}
        </RunBtn>
        <InfoButton title="3D globe traceroute">
          <p>
            Type a host and Launch — the page calls <code>GET /api/network/traceroute?host=…</code>,
            which shells out to the OS <code>traceroute</code> binary on the server and
            returns every router hop along the path.
          </p>
          <p>
            Each hop is enriched server-side with <b>ASN ownership</b> and
            <b> geo-coordinates</b> (city, lat/lon) so we can place it on the globe.
            Hops without geo (private IPs, MPLS jumps) are skipped from the arc.
          </p>
          <p>
            Hops are joined by <b>great-circle arcs</b> lifted above the surface (long
            hops arc higher). Arc colour comes from the hop's ASN owner —
            Cloudflare orange, Google red, AWS yellow, and so on.
          </p>
        </InfoButton>
        <DownloadButton
          getTarget={() => canvasWrapRef.current?.querySelector('canvas') ?? null}
          filename={`globe-${result?.host ?? 'view'}`}
          disabled={loading}
          title="Download globe as PNG"
        />
      </TopBar>

      {result && (
        <StatsBar>
          <Stat><b>{result.hopCount}</b>&nbsp;hops</Stat>
          <Stat><b>{plottedCount}</b>&nbsp;geolocated</Stat>
          <Stat><b>{result.totalDurationMs}</b>&nbsp;ms total</Stat>
          {result.completed && <Stat>destination&nbsp;<b>reached</b></Stat>}
        </StatsBar>
      )}

      {!result && !loading && (
        <Hint>
          Enter a host above to <b>launch packets across the planet</b> · drag to orbit · scroll to zoom
        </Hint>
      )}

      {result?.error && plottedCount === 0 && <ErrorBanner>{result.error}</ErrorBanner>}

      <ScrollToTop />
    </Page>
  );
};
