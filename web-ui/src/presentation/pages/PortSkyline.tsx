import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
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
   Circular layout — every port is equidistant from camera & always in view
   ───────────────────────────────────────────────────────────────── */
const TOWER_FOOT = 0.34;
const TOWER_GAP  = 0.06;

interface TowerData {
  port: number;
  service: string;
  category: PortScanResult['category'];
  height: number;
  color: string;
  banner: string | null;
  responseMs: number | null;
  position: [number, number, number];
  angle: number;
}

/** Place towers around a circle. Sort by color so categories cluster visually. */
const layoutTowers = (open: PortScanResult[]): TowerData[] => {
  const sorted = [...open].sort((a, b) => {
    const ca = serviceColor(a.service, a.port);
    const cb = serviceColor(b.service, b.port);
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.port - b.port;
  });
  const n = sorted.length;
  if (n === 0) return [];
  // Radius grows with count so towers don't crowd each other
  const circumferenceTarget = Math.max(n * (TOWER_FOOT + 0.5), 14);
  const radius = Math.max(3.5, circumferenceTarget / (2 * Math.PI));
  return sorted.map((r, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const ms = r.responseMs ?? 200;
    const h = 1.0 + Math.max(0.3, Math.min(3.2, 3.2 - Math.log(Math.max(1, ms)) * 0.45));
    return {
      port: r.port,
      service: r.service,
      category: r.category,
      height: h,
      color: serviceColor(r.service, r.port),
      banner: r.banner,
      responseMs: r.responseMs,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
      angle,
    };
  });
};

/* ─────────────────────────────────────────────────────────────────
   3D pieces
   ───────────────────────────────────────────────────────────────── */

/** Concentric ring floor with radial spokes — looks like a radar dish. */
const RingFloor: React.FC<{ radius: number }> = ({ radius }) => {
  const outer = radius + 1.6;
  const rings = [0.25, 0.5, 0.75, 1].map(f => f * radius + 0.4);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[outer, 96]} />
        <meshBasicMaterial color="#070B17" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[outer - 0.04, outer, 96]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {rings.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[r - 0.012, r + 0.012, 96]} />
          <meshBasicMaterial color="#1F2A44" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={`spoke-${i}`}
            position={[Math.cos(a) * outer * 0.5, 0.001, Math.sin(a) * outer * 0.5]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[outer, 0.012]} />
            <meshBasicMaterial color="#162033" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
};

/* Active scanning visualisation:
   • rotating beam fan (radar dish)
   • three expanding ground ring pulses (sonar)
   • particle probes flying outward in golden-angle pattern (network packets) */
const ScanRadar: React.FC<{ radius: number }> = ({ radius }) => {
  const beamRef   = useRef<THREE.Group>(null);
  const ring1Ref  = useRef<THREE.Mesh>(null);
  const ring2Ref  = useRef<THREE.Mesh>(null);
  const ring3Ref  = useRef<THREE.Mesh>(null);
  const probesRef = useRef<THREE.Group>(null);
  const PROBE_COUNT = 48;
  const reach = radius + 1.5;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (beamRef.current) beamRef.current.rotation.y = t * 1.6;

    const animateRing = (m: THREE.Mesh | null, offset: number) => {
      if (!m) return;
      const cycle = 1.8;
      const phase = ((t + offset) % cycle) / cycle;
      const s = 0.2 + phase * (reach * 1.8);
      m.scale.set(s, s, s);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.75;
    };
    animateRing(ring1Ref.current, 0);
    animateRing(ring2Ref.current, 0.6);
    animateRing(ring3Ref.current, 1.2);

    if (probesRef.current) {
      const kids = probesRef.current.children;
      for (let i = 0; i < kids.length; i++) {
        const cycle = 1.6;
        const offset = (i / kids.length) * cycle;
        const p = ((t + offset) % cycle) / cycle;
        const angle = i * 2.39996; // golden angle for even spread
        const r = p * reach;
        const c = kids[i] as THREE.Mesh;
        c.position.set(Math.cos(angle) * r, 0.18 + Math.sin(p * Math.PI) * 0.5, Math.sin(angle) * r);
        const mat = c.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - p) * 0.95;
      }
    }
  });

  return (
    <group>
      {/* Central scanner pillar */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 1.1, 20]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#A78BFA" emissive="#A78BFA" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={2.4} distance={radius * 2 + 4} color="#22D3EE" />

      {/* Rotating sweep fan */}
      <group ref={beamRef} position={[0, 0.4, 0]}>
        <mesh position={[reach / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, reach, 48, 1, 0, Math.PI / 5]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.28} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[reach / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, reach, 48, 1, 0, Math.PI / 18]} />
          <meshBasicMaterial color="#A78BFA" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      {/* Expanding ground rings */}
      {[ring1Ref, ring2Ref, ring3Ref].map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.5, 0.56, 64]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}

      {/* Outbound probe packets */}
      <group ref={probesRef}>
        {Array.from({ length: PROBE_COUNT }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color={i % 4 === 0 ? '#A78BFA' : '#22D3EE'} transparent opacity={0.9} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/* A single tower — grow-in animation, always-visible port label, hover glow */
const Tower: React.FC<{
  data: TowerData;
  delay: number;
  hovered: boolean;
  onHover: (v: boolean) => void;
}> = ({ data, delay, hovered, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);
  const [grown, setGrown] = useState(false);

  useFrame(({ clock }) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime + delay;
    const elapsed = clock.elapsedTime - startRef.current;
    const t = Math.max(0, Math.min(1, elapsed / 0.7));
    const eased = 1 - Math.pow(1 - t, 3);
    if (t >= 1 && !grown) setGrown(true);
    if (meshRef.current) {
      meshRef.current.scale.y = Math.max(eased, 0.001);
      meshRef.current.position.y = (data.height * eased) / 2;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered ? 1.8 : 0.85 + Math.sin(clock.elapsedTime * 2 + data.port) * 0.18;
    }
    if (baseRef.current) {
      const m = baseRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = hovered ? 1 : 0.55 + Math.sin(clock.elapsedTime * 2 + data.port) * 0.1;
    }
  });

  return (
    <group position={data.position}>
      {/* Glowing base pad */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[TOWER_FOOT * 0.85, TOWER_FOOT * 1.5, 24]} />
        <meshBasicMaterial color={data.color} transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
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
          emissiveIntensity={0.85}
          roughness={0.35}
          metalness={0.15}
          toneMapped={false}
        />
      </mesh>
      {/* Beacon light at the top */}
      <mesh position={[0, data.height + 0.1, 0]}>
        <sphereGeometry args={[hovered ? 0.07 : 0.045, 14, 14]} />
        <meshBasicMaterial color={data.color} toneMapped={false} />
      </mesh>
      {/* Always-visible port label, billboarded to camera */}
      {grown && (
        <Billboard position={[0, data.height + 0.55, 0]}>
          <Text
            fontSize={0.34}
            color={data.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor="#000"
          >
            :{data.port}
          </Text>
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.18}
            color="#E8EEFF"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#000"
          >
            {data.service}
          </Text>
        </Billboard>
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
  const maxRadius = useMemo(() => {
    if (towers.length === 0) return 5;
    return Math.max(...towers.map(t => Math.hypot(t.position[0], t.position[2])));
  }, [towers]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 10, 5]} intensity={0.7} />
      <directionalLight position={[-6, 4, -4]} intensity={0.3} color="#7C9CFF" />
      <fog attach="fog" args={['#04060B', 14, 42]} />

      <RingFloor radius={maxRadius} />
      {loading && <ScanRadar radius={Math.max(maxRadius, 5)} />}

      {towers.map((t, i) => (
        <Tower
          key={`t-${t.port}`}
          data={t}
          delay={i * 0.04}
          hovered={hoveredPort === t.port}
          onHover={(v) => setHoveredPort(v ? t.port : null)}
        />
      ))}

      <CinematicCamera towers={towers} loading={loading} />
    </>
  );
};

/* Camera behaviour:
   • Scanning           → cinematic orbit around the radar (energy & motion)
   • Results in         → ease to a static framing that fits every tower
                          (viewport-aware: portrait pulls the camera back further)
   • Idle / no towers   → default vantage  */
const CinematicCamera: React.FC<{ towers: TowerData[]; loading: boolean }> = ({ towers, loading }) => {
  const { camera, size } = useThree();
  const isPortrait = size.height > size.width;

  const framing = useMemo(() => {
    if (towers.length === 0) {
      return {
        pos:  [0, 4.5, isPortrait ? 13 : 9] as [number, number, number],
        look: [0, 0.6, 0] as [number, number, number],
      };
    }
    let maxR = 0, maxY = 0;
    for (const t of towers) {
      const r = Math.hypot(t.position[0], t.position[2]);
      if (r > maxR) maxR = r;
      if (t.height > maxY) maxY = t.height;
    }
    // Distance scaled to fit ring; portrait needs ~1.6x extra pull-back.
    const baseDist = maxR + 3.5;
    const dist = baseDist * (isPortrait ? 1.95 : 1.35);
    const height = Math.max(maxY * 0.7 + 3.5, maxR * 0.85);
    return {
      pos:  [0, height, dist] as [number, number, number],
      look: [0, Math.min(maxY * 0.45, 1.2), 0] as [number, number, number],
    };
  }, [towers, isPortrait]);

  const lookTarget = useRef(new THREE.Vector3(...framing.look));

  useFrame(({ clock }, delta) => {
    if (loading) {
      const t = clock.elapsedTime * 0.28;
      const radius = isPortrait ? 12 : 9.5;
      camera.position.x = Math.sin(t) * radius * 0.55;
      camera.position.y = 4.5 + Math.sin(t * 0.5) * 0.5;
      camera.position.z = Math.cos(t) * radius * 0.75 + 1.5;
      lookTarget.current.set(0, 0.6, 0);
      camera.lookAt(lookTarget.current);
      return;
    }
    // Smoothly ease into static framing then hold.
    const k = 1 - Math.pow(0.001, delta); // ~99% of the way per second
    camera.position.x += (framing.pos[0] - camera.position.x) * k;
    camera.position.y += (framing.pos[1] - camera.position.y) * k;
    camera.position.z += (framing.pos[2] - camera.position.z) * k;
    lookTarget.current.x += (framing.look[0] - lookTarget.current.x) * k;
    lookTarget.current.y += (framing.look[1] - lookTarget.current.y) * k;
    lookTarget.current.z += (framing.look[2] - lookTarget.current.z) * k;
    camera.lookAt(lookTarget.current);
  });
  return null;
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
          Enter a host above to <b>scan ~150 common service ports</b> · open ports rise as towers · hover for details
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
