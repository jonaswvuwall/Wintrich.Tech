import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { networkApi, type PortScanResponse, type PortScanResult } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import { Button, Input, LoadingSpinner } from '../components/StyledComponents';
import { VisualizeTabs } from '../components/VisualizeTabs';
import { ScrollToTop } from '../components/ScrollToTop';

/* ─────────────────────────────────────────────────────────────────
   Service classification → tower color
   ───────────────────────────────────────────────────────────────── */
const serviceColor = (service: string, port: number): string => {
  const s = service.toLowerCase();
  // HTTP family — red/orange
  if (s.includes('http') || s.includes('proxy') || port === 80 || port === 443 || port === 8080 || port === 8443)
    return '#F43F5E';
  // SSH / remote shells — green
  if (s.includes('ssh') || s.includes('telnet') || s.includes('rdp') || s.includes('vnc'))
    return '#10E0A8';
  // Mail — orange
  if (s.includes('smtp') || s.includes('imap') || s.includes('pop3') || s.includes('submission'))
    return '#FB923C';
  // Database — purple
  if (s.includes('sql') || s.includes('mongo') || s.includes('redis') || s.includes('postgres')
      || s.includes('cassandra') || s.includes('couchdb') || s.includes('influxdb')
      || s.includes('elasticsearch') || s.includes('memcached') || s.includes('oracle'))
    return '#A78BFA';
  // DNS / directory — cyan
  if (s.includes('dns') || s.includes('ldap') || s.includes('kerberos'))
    return '#22D3EE';
  // File / share — yellow
  if (s.includes('ftp') || s.includes('smb') || s.includes('nfs') || s.includes('rsync') || s.includes('tftp'))
    return '#FBBF24';
  // VPN / tunnel — blue
  if (s.includes('vpn') || s.includes('ipsec') || s.includes('isakmp') || s.includes('l2tp') || s.includes('pptp') || s.includes('tor'))
    return '#60A5FA';
  // Container / orchestration — magenta
  if (s.includes('docker') || s.includes('kubernetes') || s.includes('consul') || s.includes('vault'))
    return '#EC4899';
  // Suspicious / known malware — bright red
  if (s.includes('elite') || s.includes('metasploit') || s.includes('netbus') || s.includes('back-orifice') || s.includes('adb'))
    return '#FF1744';
  // Default — soft cyan
  return '#7C9CFF';
};

/* ─────────────────────────────────────────────────────────────────
   City layout
   ───────────────────────────────────────────────────────────────── */
const CITY_WIDTH  = 16; // x extent
const CITY_DEPTH  = 4;  // z extent
const TOWER_FOOT  = 0.18;
const TOWER_GAP   = 0.04;

interface TowerData {
  port: number;
  service: string;
  category: PortScanResult['category'];
  height: number;       // visual height (clamped log of port latency)
  color: string;
  banner: string | null;
  responseMs: number | null;
  position: [number, number, number];
}

/** Position a tower along the x-axis using a log mapping of port number, grouped by district. */
const layoutTowers = (open: PortScanResult[]): TowerData[] => {
  // X position: log scale across full port range (1..65535) so well-known ports cluster on the left
  // but high-numbered services still get distinct positions.
  const xFor = (port: number) => {
    const t = Math.log(Math.max(1, port)) / Math.log(65535); // 0..1
    return -CITY_WIDTH / 2 + t * CITY_WIDTH;
  };

  // Z position: jitter inside the district by a hash of the port to avoid overlap
  const zFor = (port: number) => {
    const hash = Math.sin(port * 12.9898) * 43758.5453;
    const frac = hash - Math.floor(hash);
    return -CITY_DEPTH / 2 + frac * CITY_DEPTH;
  };

  return open.map(r => {
    // Tower height: faster response = taller, more confident "this is real"
    const ms = r.responseMs ?? 200;
    const h = 0.6 + Math.max(0.2, Math.min(3.5, 3.5 - Math.log(Math.max(1, ms)) * 0.4));
    return {
      port: r.port,
      service: r.service,
      category: r.category,
      height: h,
      color: serviceColor(r.service, r.port),
      banner: r.banner,
      responseMs: r.responseMs,
      position: [xFor(r.port), 0, zFor(r.port)] as [number, number, number],
    };
  });
};

/* ─────────────────────────────────────────────────────────────────
   3D pieces
   ───────────────────────────────────────────────────────────────── */
const GroundGrid: React.FC = () => {
  // Two-plane grid: dark base + cyan grid lines
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[CITY_WIDTH + 4, CITY_DEPTH + 4]} />
        <meshBasicMaterial color="#0A0F1F" />
      </mesh>
      <gridHelper
        args={[CITY_WIDTH + 4, 40, '#1F2A44', '#162033']}
        position={[0, 0, 0]}
      />
    </>
  );
};

/** Base "district" plates showing groups: well-known / registered / dynamic */
const Districts: React.FC = () => {
  // Boundaries at ports 1024 and 49152 → log positions
  const xAt = (port: number) => {
    const t = Math.log(port) / Math.log(65535);
    return -CITY_WIDTH / 2 + t * CITY_WIDTH;
  };
  const x1 = xAt(1024);
  const x2 = xAt(49152);

  return (
    <>
      <DistrictPlate from={-CITY_WIDTH / 2} to={x1} color="#0F2E2A" label="WELL-KNOWN  ·  0–1023" />
      <DistrictPlate from={x1}              to={x2} color="#0F1A2E" label="REGISTERED  ·  1024–49151" />
      <DistrictPlate from={x2}              to={CITY_WIDTH / 2} color="#1A0F2E" label="DYNAMIC  ·  49152+" />
    </>
  );
};

const DistrictPlate: React.FC<{ from: number; to: number; color: string; label: string }> = ({ from, to, color, label }) => {
  const w = to - from;
  const cx = (from + to) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.001, 0]}>
        <planeGeometry args={[w - 0.05, CITY_DEPTH]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <Text
        position={[cx, 0.01, CITY_DEPTH / 2 + 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#7C9CFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#000"
      >
        {label}
      </Text>
    </group>
  );
};

/* Sweeping scan wave — semi-transparent vertical plane that travels left → right while loading. */
const ScanWave: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (!active) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const period = 2.4; // seconds
    const t = (clock.elapsedTime % period) / period;
    ref.current.position.x = -CITY_WIDTH / 2 + t * CITY_WIDTH;
  });
  return (
    <mesh ref={ref} position={[-CITY_WIDTH / 2, 2, 0]}>
      <planeGeometry args={[0.15, 4]} />
      <meshBasicMaterial color="#22D3EE" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
};

/* A single tower — animated grow-in, hover glow, click to lift label */
const Tower: React.FC<{
  data: TowerData;
  delay: number;
  hovered: boolean;
  onHover: (v: boolean) => void;
}> = ({ data, delay, hovered, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime + delay;
    const elapsed = clock.elapsedTime - startRef.current;
    const t = Math.max(0, Math.min(1, elapsed / 0.6));
    const eased = 1 - Math.pow(1 - t, 3);
    if (meshRef.current) {
      meshRef.current.scale.y = eased;
      meshRef.current.position.y = (data.height * eased) / 2;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered ? 1.6 : 0.7 + Math.sin(clock.elapsedTime * 2 + data.port) * 0.15;
    }
    if (baseRef.current) {
      const m = baseRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = hovered ? 0.9 : 0.5;
    }
  });

  return (
    <group position={data.position}>
      {/* Glowing base pad */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[TOWER_FOOT * 0.8, TOWER_FOOT * 1.4, 24]} />
        <meshBasicMaterial color={data.color} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Tower body */}
      <mesh
        ref={meshRef}
        position={[0, data.height / 2, 0]}
        scale={[1, 0.001, 1]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
        onPointerOut={() => onHover(false)}
      >
        <boxGeometry args={[TOWER_FOOT - TOWER_GAP, data.height, TOWER_FOOT - TOWER_GAP]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={0.7}
          roughness={0.4}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
      {/* Antenna spike on top */}
      <mesh position={[0, data.height + 0.08, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.12, 6]} />
        <meshBasicMaterial color={data.color} toneMapped={false} />
      </mesh>
      {/* Beacon light at the top */}
      <mesh position={[0, data.height + 0.16, 0]}>
        <sphereGeometry args={[hovered ? 0.04 : 0.025, 12, 12]} />
        <meshBasicMaterial color={data.color} toneMapped={false} />
      </mesh>
      {/* Floating port label, only when hovered */}
      {hovered && (
        <Text
          position={[0, data.height + 0.4, 0]}
          fontSize={0.13}
          color={data.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000"
        >
          {data.port} · {data.service}
        </Text>
      )}
    </group>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Scene
   ───────────────────────────────────────────────────────────────── */
const Scene: React.FC<{
  towers: TowerData[];
  loading: boolean;
  hoveredPort: number | null;
  setHoveredPort: (p: number | null) => void;
}> = ({ towers, loading, hoveredPort, setHoveredPort }) => {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 10, 5]} intensity={0.7} />
      <directionalLight position={[-6, 4, -4]} intensity={0.25} color="#7C9CFF" />
      {/* Soft fog for depth */}
      <fog attach="fog" args={['#04060B', 8, 30]} />

      <GroundGrid />
      <Districts />
      <ScanWave active={loading} />

      {towers.map((t, i) => (
        <Tower
          key={`t-${t.port}`}
          data={t}
          delay={i * 0.04}
          hovered={hoveredPort === t.port}
          onHover={(v) => setHoveredPort(v ? t.port : null)}
        />
      ))}

      <OrbitControls
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 0.5, 0]}
      />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Page chrome (matches sibling Visualize pages)
   ───────────────────────────────────────────────────────────────── */
const fadeIn = keyframes` from { opacity: 0; } to { opacity: 1; } `;

const Page = styled.div`
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 50% 100%, #0A1020 0%, #04060B 70%, #000 100%);
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
  width: min(900px, calc(100% - 1rem));
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
  width: min(900px, calc(100% - 1rem));
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

const InfoCard = styled.div`
  position: absolute;
  bottom: 1.2rem; left: 1.2rem;
  z-index: 1000;
  background: rgba(6, 7, 12, 0.85);
  backdrop-filter: blur(14px);
  border: 1px solid ${theme.colors.border};
  border-radius: 14px;
  padding: 0.85rem 1rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: ${theme.colors.text};
  max-width: min(420px, calc(100% - 2.4rem));
  animation: ${fadeIn} 0.25s ease-out;

  .title { display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.4rem; }
  .port  { font-size: 1.05rem; font-weight: 700; }
  .svc   { color: ${theme.colors.textMuted}; font-size: 0.78rem; }
  .meta  { color: ${theme.colors.textSecondary}; font-size: 0.72rem; margin-top: 0.2rem; }
  .banner {
    margin-top: 0.55rem;
    padding: 0.5rem 0.6rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    font-size: 0.7rem;
    color: ${theme.colors.textSecondary};
    max-height: 80px; overflow: auto;
    word-break: break-all;
    white-space: pre-wrap;
  }

  @media (max-width: 560px) {
    left: 0.6rem; right: 0.6rem; max-width: none;
  }
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

const Legend = styled.div`
  position: absolute;
  top: calc(clamp(5.5rem, 8vh, 7rem) + 130px);
  right: 1rem;
  z-index: 999;
  background: rgba(6, 7, 12, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  color: ${theme.colors.textMuted};
  display: grid; gap: 0.25rem;
  pointer-events: none;
  animation: ${fadeIn} 0.5s ease-out 0.2s both;

  .row { display: flex; align-items: center; gap: 0.4rem; }
  .sw  { width: 10px; height: 10px; border-radius: 2px; }

  @media (max-width: 720px) { display: none; }
`;

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */
export const PortSkyline: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortScanResponse | null>(null);
  const [hoveredPort, setHoveredPort] = useState<number | null>(null);
  const [runId, setRunId] = useState(0);

  const open = useMemo(
    () => result?.results.filter(r => r.open) ?? [],
    [result],
  );

  const towers = useMemo(() => layoutTowers(open), [open]);
  const hoveredTower = useMemo(
    () => towers.find(t => t.port === hoveredPort) ?? null,
    [towers, hoveredPort],
  );

  // When a new result lands, auto-clear hover
  useEffect(() => { setHoveredPort(null); }, [runId]);

  const run = async (host: string) => {
    const trimmed = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!trimmed) return;
    setTarget(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const data = await networkApi.portScan(trimmed);
      setResult(data);
      setRunId(id => id + 1);
    } catch (e) {
      setResult({
        host: trimmed, resolvedIp: null, portsScanned: 0, openCount: 0,
        totalDurationMs: 0, timestamp: new Date().toISOString(),
        results: [], error: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally { setLoading(false); }
  };

  return (
    <Page>
      <CanvasWrap>
        <Canvas
          camera={{ position: [0, 4, 9], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#04060B']} />
          <Scene
            key={runId}
            towers={towers}
            loading={loading}
            hoveredPort={hoveredPort}
            setHoveredPort={setHoveredPort}
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
          {loading ? <LoadingSpinner /> : 'Scan'}
        </RunBtn>
      </TopBar>

      {result && (
        <StatsBar>
          <Stat><b>{result.openCount}</b>&nbsp;open</Stat>
          <Stat><b>{result.portsScanned}</b>&nbsp;scanned</Stat>
          <Stat><b>{result.totalDurationMs}</b>&nbsp;ms</Stat>
          {result.resolvedIp && <Stat>ip&nbsp;<b>{result.resolvedIp}</b></Stat>}
        </StatsBar>
      )}

      {result && result.openCount > 0 && (
        <Legend>
          <div className="row"><span className="sw" style={{ background: '#F43F5E' }} />HTTP / web</div>
          <div className="row"><span className="sw" style={{ background: '#10E0A8' }} />SSH / shell</div>
          <div className="row"><span className="sw" style={{ background: '#A78BFA' }} />Database</div>
          <div className="row"><span className="sw" style={{ background: '#FB923C' }} />Mail</div>
          <div className="row"><span className="sw" style={{ background: '#22D3EE' }} />DNS / dir</div>
          <div className="row"><span className="sw" style={{ background: '#FBBF24' }} />File share</div>
          <div className="row"><span className="sw" style={{ background: '#60A5FA' }} />VPN / tunnel</div>
          <div className="row"><span className="sw" style={{ background: '#FF1744' }} />Suspicious</div>
        </Legend>
      )}

      {hoveredTower && (
        <InfoCard>
          <div className="title">
            <span className="port" style={{ color: hoveredTower.color }}>:{hoveredTower.port}</span>
            <span className="svc">{hoveredTower.service}</span>
          </div>
          <div className="meta">
            {hoveredTower.responseMs != null && <>response {hoveredTower.responseMs} ms · </>}
            {hoveredTower.category}
          </div>
          {hoveredTower.banner && (
            <div className="banner">{hoveredTower.banner}</div>
          )}
        </InfoCard>
      )}

      {!result && !loading && (
        <Hint>
          Enter a host above to <b>scan ~150 common service ports</b> · open ports rise as towers · drag to orbit
        </Hint>
      )}

      {result && result.openCount === 0 && !result.error && (
        <Hint><b>No common ports open.</b> Either firewalled, well-configured, or the host isn't listening on standard services.</Hint>
      )}

      {result?.error && <ErrorBanner>{result.error}</ErrorBanner>}

      <ScrollToTop />
    </Page>
  );
};
