import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Logo } from '../components/Logo';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Hero = styled.section`
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  align-items: center;
  gap: clamp(2rem, 6vw, 6rem);
  padding: clamp(6rem, 10vh, 9rem) clamp(1.25rem, 6vw, 6rem) clamp(3rem, 6vh, 6rem);

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    text-align: center;
    padding-top: 7rem;
  }
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  width: fit-content;
  animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (max-width: 980px) { margin: 0 auto; }

  &::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${theme.colors.success};
    box-shadow: 0 0 10px ${theme.colors.success};
    animation: pulseDot 2s ease-in-out infinite;
  }

  @keyframes pulseDot {
    0%,100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
`;

const Headline = styled.h1`
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: clamp(2.4rem, 6.6vw, 5.6rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1;
  margin: 1.25rem 0 1.4rem;
  animation: ${fadeUp} 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;

  span.grad {
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
    animation: shift 8s ease-in-out infinite;
  }

  span.muted {
    color: ${theme.colors.textSecondary};
  }

  @keyframes shift {
    0%,100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

const Lede = styled.p`
  font-size: clamp(1rem, 1.4vw, 1.18rem);
  color: ${theme.colors.textSecondary};
  line-height: 1.7;
  max-width: 56ch;
  animation: ${fadeUp} 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;

  @media (max-width: 980px) { margin: 0 auto; }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.85rem;
  margin-top: 2rem;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;

  @media (max-width: 980px) { justify-content: center; }
`;

const PrimaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.95rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.98rem;
  text-decoration: none;
  color: #06070C;
  background: ${theme.gradients.brand};
  box-shadow: 0 12px 32px rgba(34, 211, 238, 0.3);
  position: relative;
  overflow: hidden;
  transition: all ${theme.transitions.normal};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%);
    opacity: 0;
    transition: opacity ${theme.transitions.normal};
    z-index: 0;
  }

  span { position: relative; z-index: 1; }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(167, 139, 250, 0.45);
    &::after { opacity: 1; }
  }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.92rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.98rem;
  text-decoration: none;
  color: ${theme.colors.text};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.borderStrong};
  backdrop-filter: blur(12px);
  transition: all ${theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 211, 238, 0.55);
    background: rgba(34, 211, 238, 0.08);
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: clamp(1.25rem, 3vw, 3rem);
  margin-top: 3rem;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;

  @media (max-width: 980px) { justify-content: center; }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  strong {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.6rem;
    font-weight: 700;
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  span {
    color: ${theme.colors.textMuted};
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

/* ---------- Visual / right column ---------- */

const slowSpin = keyframes`
  to { transform: rotate(360deg); }
`;

const float = keyframes`
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-14px); }
`;

const Visual = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 560px;
  justify-self: end;
  display: grid;
  place-items: center;
  animation: ${fadeUp} 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;

  @media (max-width: 980px) {
    justify-self: center;
    max-width: 380px;
    margin-top: 2rem;
  }
`;

const Halo = styled.div`
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.45), transparent 60%),
    radial-gradient(circle at 70% 70%, rgba(167, 139, 250, 0.4), transparent 60%);
  filter: blur(40px);
`;

const Ring = styled.div<{ $size: string; $duration: number; $reverse?: boolean }>`
  position: absolute;
  width: ${p => p.$size};
  height: ${p => p.$size};
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  animation: ${slowSpin} ${p => p.$duration}s linear infinite ${p => p.$reverse ? 'reverse' : ''};
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

const Center = styled.div`
  position: relative;
  width: 46%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.14), rgba(10,12,18,0.8));
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
  backdrop-filter: blur(8px);
  box-shadow: 0 30px 80px rgba(34, 211, 238, 0.25), inset 0 0 30px rgba(255,255,255,0.04);
  animation: ${float} 6s ease-in-out infinite;
`;

const Tag = styled.div<{ $top: string; $left?: string; $right?: string; $delay: number }>`
  position: absolute;
  top: ${p => p.$top};
  ${p => p.$left ? `left: ${p.$left};` : ''}
  ${p => p.$right ? `right: ${p.$right};` : ''}
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(14, 17, 23, 0.85);
  border: 1px solid ${theme.colors.borderStrong};
  backdrop-filter: blur(12px);
  font-size: 0.78rem;
  font-weight: 600;
  color: ${theme.colors.text};
  white-space: nowrap;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  animation: ${float} 5s ease-in-out infinite;
  animation-delay: ${p => p.$delay}s;

  &::before {
    content: '';
    width: 8px; height: 8px; border-radius: 50%;
    background: ${theme.gradients.brand};
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
  }
`;

/* ---------- Feature strip ---------- */

const Features = styled.section`
  position: relative;
  padding: clamp(3rem, 6vw, 6rem) clamp(1.25rem, 6vw, 6rem) clamp(4rem, 8vw, 8rem);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
`;

const Feature = styled.div`
  position: relative;
  padding: 1.5rem;
  border-radius: 18px;
  background: rgba(14, 17, 23, 0.55);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(12px);
  transition: all ${theme.transitions.normal};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${theme.gradients.brandSoft};
    opacity: 0;
    transition: opacity ${theme.transitions.normal};
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(34, 211, 238, 0.35);
    box-shadow: 0 16px 40px rgba(34, 211, 238, 0.15);
    &::before { opacity: 1; }
  }

  > * { position: relative; z-index: 1; }
`;

const FIcon = styled.div`
  width: 42px; height: 42px;
  border-radius: 12px;
  display: grid; place-items: center;
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid rgba(34, 211, 238, 0.25);
  margin-bottom: 1rem;
  color: ${theme.colors.primary};
`;

const FTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
`;

const FDesc = styled.p`
  font-size: 0.9rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.55;
`;

/* SVG icons */
const Icon = {
  Ping: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14 0" /><path d="M2 8.82a16 16 0 0 1 20 0" />
      <path d="M8.5 16.42a6 6 0 0 1 7 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  Dns: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Http: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Tls: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
};

export const Home: React.FC = () => {
  return (
    <Page>
      <Hero>
        <div>
          <Eyebrow>Network Intelligence Platform</Eyebrow>
          <Headline>
            Diagnose <span className="grad">every packet.</span><br />
            <span className="muted">Understand the wire.</span>
          </Headline>
          <Lede>
            A modern toolkit for engineers who care about latency, resolution, and trust.
            Run ping, DNS, HTTP and TLS diagnostics with a clean interface and rigorous insight —
            all powered by a hardened ASP.NET Core backend.
          </Lede>

          <Actions>
            <PrimaryBtn to="/dashboard"><span>Launch dashboard →</span></PrimaryBtn>
            <SecondaryBtn to="/about">About the build</SecondaryBtn>
          </Actions>

          <StatsRow>
            <Stat><strong>4</strong><span>Diagnostic tools</span></Stat>
            <Stat><strong>&lt; 50ms</strong><span>Typical query</span></Stat>
            <Stat><strong>SSRF</strong><span>Hardened backend</span></Stat>
          </StatsRow>
        </div>

        <Visual>
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
          <Center>
            <Logo size={140} />
          </Center>

          <Tag $top="6%" $left="2%" $delay={0}>Ping · 12ms</Tag>
          <Tag $top="22%" $right="0%" $delay={1.2}>DNS · A / AAAA</Tag>
          <Tag $top="78%" $left="6%" $delay={0.6}>TLS · valid 89d</Tag>
          <Tag $top="86%" $right="6%" $delay={1.8}>HTTP · 200</Tag>
        </Visual>
      </Hero>

      <Features>
        <Feature>
          <FIcon><Icon.Ping /></FIcon>
          <FTitle>Connectivity</FTitle>
          <FDesc>Reach any host and measure round-trip latency with precise timing.</FDesc>
        </Feature>
        <Feature>
          <FIcon><Icon.Dns /></FIcon>
          <FTitle>DNS Intelligence</FTitle>
          <FDesc>Resolve A, AAAA, MX, NS and TXT records with structured output.</FDesc>
        </Feature>
        <Feature>
          <FIcon><Icon.Http /></FIcon>
          <FTitle>HTTP Inspection</FTitle>
          <FDesc>Inspect status codes, headers and timings — without leaving the browser.</FDesc>
        </Feature>
        <Feature>
          <FIcon><Icon.Tls /></FIcon>
          <FTitle>TLS Audit</FTitle>
          <FDesc>Read certificate chains, expiry windows, and cipher posture at a glance.</FDesc>
        </Feature>
      </Features>
    </Page>
  );
};
