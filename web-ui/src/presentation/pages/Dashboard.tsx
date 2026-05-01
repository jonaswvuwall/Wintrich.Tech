import React from 'react';
import styled, { keyframes } from 'styled-components';
import { PingTool } from '../components/PingTool';
import { DnsTool } from '../components/DnsTool';
import { HttpTool } from '../components/HttpTool';
import { TlsTool } from '../components/TlsTool';
import { SecurityTool } from '../components/SecurityTool';
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
  width: min(1320px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
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
          <MetaPill $color={theme.colors.primary}><b>6</b> tools active</MetaPill>
        </TopMeta>
      </Header>

      <Grid>
        <FullDiagnosticTool />
        <PingTool />
        <DnsTool />
        <HttpTool />
        <TlsTool />
        <SecurityTool />
      </Grid>

      <Footer>
        <span>© 2026 Wintrich.Tech — Network Intelligence</span>
        <span>Built by Wintrich.Tech</span>
      </Footer>

      <ScrollToTop />
    </Page>
  );
};

