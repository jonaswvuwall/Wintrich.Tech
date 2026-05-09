import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { PingTool } from '../components/PingTool';
import { DnsTool } from '../components/DnsTool';
import { HttpTool } from '../components/HttpTool';
import { TlsTool } from '../components/TlsTool';
import { SecurityTool } from '../components/SecurityTool';
import { EmailAuthTool } from '../components/EmailAuthTool';
import { WhoisTool } from '../components/WhoisTool';
import { FullDiagnosticTool } from '../components/FullDiagnosticTool';
import { ScrollToTop } from '../components/ScrollToTop';
import { theme } from '../styles/theme';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ---------- Ambient backdrop animation (echoes the Home hero) ---------- */

const slowSpin = keyframes`
  to { transform: translate(-50%, -50%) rotate(360deg); }
`;

const slowSpinReverse = keyframes`
  to { transform: translate(-50%, -50%) rotate(-360deg); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
`;

/*
  A large orbital system pinned to the upper-right edge, partially clipped
  off-screen — a subtle echo of the Home hero's logo orbits, providing
  identity continuity without competing with the dashboard content.
*/
const OrbitStage = styled.div`
  position: absolute;
  top: -20%;
  right: -25%;
  width: clamp(700px, 70vw, 1100px);
  aspect-ratio: 1;
  opacity: 0.55;

  @media (max-width: 980px) {
    top: -10%;
    right: -45%;
    opacity: 0.4;
  }
`;

const Halo = styled.div`
  position: absolute;
  inset: 18%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.28), transparent 60%),
    radial-gradient(circle at 70% 70%, rgba(167, 139, 250, 0.24), transparent 60%);
  filter: blur(50px);
`;

const Ring = styled.div<{ $size: string; $duration: number; $reverse?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${p => p.$size};
  height: ${p => p.$size};
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.10);
  transform: translate(-50%, -50%);
  animation: ${p => p.$reverse ? slowSpinReverse : slowSpin} ${p => p.$duration}s linear infinite;
`;

const OrbitDot = styled.div<{ $color: string }>`
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$color};
  box-shadow: 0 0 16px ${p => p.$color};
`;

/* ---------- Page layout ---------- */

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 4vw, 3rem) clamp(3rem, 6vh, 5rem);
`;

const Header = styled.header`
  position: relative;
  z-index: 1;
  width: min(1320px, 100%);
  margin: 0 auto 2.5rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${theme.colors.textMuted};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.6rem;

  &::before {
    content: '';
    width: 28px; height: 1px;
    background: ${theme.gradients.brand};
  }
`;

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.05;

  span.grad {
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Sub = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: 1rem;
  margin-top: 0.6rem;
  max-width: 60ch;
`;

const TopMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

const MetaPill = styled.div<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(14, 17, 23, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  font-weight: 500;

  b {
    color: ${theme.colors.text};
    font-weight: 600;
  }

  &::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${p => p.$color ?? theme.colors.success};
    box-shadow: 0 0 8px ${p => p.$color ?? theme.colors.success};
  }
`;

const Grid = styled.div`
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  > * {
    animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  > *:nth-child(1) { animation-delay: 0.05s; }
  > *:nth-child(2) { animation-delay: 0.10s; }
  > *:nth-child(3) { animation-delay: 0.15s; }
  > *:nth-child(4) { animation-delay: 0.20s; }
  > *:nth-child(5) { animation-delay: 0.25s; }
  > *:nth-child(6) { animation-delay: 0.30s; }
`;

const Footer = styled.footer`
  position: relative;
  z-index: 1;
  width: min(1320px, 100%);
  margin: 4rem auto 0;
  padding-top: 2rem;
  border-top: 1px solid ${theme.colors.border};
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: ${theme.colors.textMuted};
  font-size: 0.82rem;
`;

const VisualizeBanner = styled(Link)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: min(960px, 100%);
  margin: 0 auto 1.5rem;
  padding: 1.1rem 1.4rem;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(ellipse at top right, rgba(167,139,250,0.18), transparent 60%),
    linear-gradient(135deg, rgba(34,211,238,0.10), rgba(167,139,250,0.10));
  border: 1px solid rgba(167, 139, 250, 0.45);
  backdrop-filter: blur(12px);
  overflow: hidden;
  animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: all ${theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    border-color: #A78BFA;
    box-shadow: 0 16px 40px rgba(167, 139, 250, 0.22);
  }

  .icon {
    flex: 0 0 auto;
    width: 46px; height: 46px;
    border-radius: 12px;
    display: grid; place-items: center;
    background: rgba(167, 139, 250, 0.18);
    border: 1px solid rgba(167, 139, 250, 0.45);
    color: #A78BFA;
  }
  .body { flex: 1 1 auto; min-width: 0; }
  .title {
    font-size: 1rem; font-weight: 600;
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    margin-bottom: 0.2rem;
  }
  .badge {
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.16rem 0.45rem; border-radius: 999px;
    background: linear-gradient(135deg, #22D3EE, #A78BFA); color: #06070C;
  }
  .desc { font-size: 0.85rem; color: ${theme.colors.textSecondary}; line-height: 1.45; }
  .arrow { font-size: 1.2rem; color: ${theme.colors.textMuted}; flex-shrink: 0; }

  @media (max-width: 560px) {
    padding: 0.9rem 1rem; gap: 0.75rem;
    .icon { width: 40px; height: 40px; }
    .desc { font-size: 0.78rem; }
    .arrow { display: none; }
  }
`;

export const Dashboard: React.FC = () => {
  return (
    <Page>
      <Backdrop>
        <OrbitStage>
          <Halo />
          <Ring $size="98%" $duration={60}>
            <OrbitDot $color="#22D3EE" />
          </Ring>
          <Ring $size="78%" $duration={42} $reverse>
            <OrbitDot $color="#A78BFA" />
          </Ring>
          <Ring $size="58%" $duration={28}>
            <OrbitDot $color="#7C9CFF" />
          </Ring>
        </OrbitStage>
      </Backdrop>

      <Header>
        <div>
          <Eyebrow>Diagnostic tools</Eyebrow>
          <Title>
            Network <span className="grad">Tools</span>
          </Title>
          <Sub>
            Run connectivity checks, DNS lookups, HTTP analysis, and certificate inspections — all in one place.
          </Sub>
        </div>
        <TopMeta>
          <MetaPill>API <b>online</b></MetaPill>
          <MetaPill $color={theme.colors.primary}><b>8</b> tools active</MetaPill>
        </TopMeta>
      </Header>

      <VisualizeBanner to="/visualize">
        <span className="icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="9" ry="4" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
          </svg>
        </span>
        <span className="body">
          <span className="title">Network Visualizer <span className="badge">New</span></span>
          <span className="desc">Spin a 3D globe, walk a port skyline, follow traceroute on a world map, scan an anycast atlas, watch TLS handshakes — mixed 2D & 3D scenes.</span>
        </span>
        <span className="arrow">→</span>
      </VisualizeBanner>

      <Grid>
        <FullDiagnosticTool />
        <PingTool />
        <DnsTool />
        <HttpTool />
        <TlsTool />
        <SecurityTool />
        <EmailAuthTool />
        <WhoisTool />
      </Grid>

      <Footer>
        <span>© 2026 Wintrich.Tech — Network Intelligence</span>
        <span>Built by Wintrich.Tech</span>
      </Footer>

      <ScrollToTop />
    </Page>
  );
};

