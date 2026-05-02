import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Logo } from '../components/Logo';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

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

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 5vw, 4rem) clamp(3rem, 6vh, 5rem);
`;

const Wrap = styled.div`
  position: relative;
  z-index: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: ${theme.colors.textSecondary};
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 500;
  margin-bottom: 2rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: translateX(-3px);
    color: ${theme.colors.text};
    border-color: rgba(34, 211, 238, 0.4);
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 28px;
  background: rgba(14, 17, 23, 0.55);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
  }
`;

const AvatarWrap = styled.div`
  position: relative;
  width: clamp(140px, 18vw, 180px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.35), rgba(167, 139, 250, 0.25) 70%, transparent 90%);
  border: 1px solid ${theme.colors.borderStrong};
  box-shadow: 0 20px 50px rgba(34, 211, 238, 0.25);

  &::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    animation: spin 30s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Name = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.05;

  span {
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Role = styled.div`
  margin-top: 0.4rem;
  color: ${theme.colors.textSecondary};
  font-size: 1rem;
  font-weight: 500;
`;

const Bio = styled.p`
  margin-top: 1rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.7;
  max-width: 60ch;
`;

const SectionGrid = styled.div`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
`;

const Section = styled.section<{ $delay?: number }>`
  padding: 1.6rem;
  border-radius: 20px;
  background: rgba(14, 17, 23, 0.55);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(14px);
  animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: ${p => p.$delay ?? 0}s;
`;

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${theme.colors.textMuted};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &::before {
    content: '';
    width: 18px; height: 2px;
    background: ${theme.gradients.brand};
    border-radius: 2px;
  }
`;

const Skills = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Skill = styled.li`
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  border: 1px solid rgba(34, 211, 238, 0.2);
  color: ${theme.colors.text};
  font-size: 0.85rem;
  font-weight: 500;
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 211, 238, 0.55);
    background: rgba(34, 211, 238, 0.12);
  }
`;

const ProjectCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.3rem;
  margin-top: 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  color: #06070C;
  background: ${theme.gradients.brand};
  box-shadow: 0 10px 30px rgba(34, 211, 238, 0.3);
  transition: all ${theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(167, 139, 250, 0.45);
  }
`;

export const About: React.FC = () => {
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

      <Wrap>
        <Back to="/">← Back home</Back>

        <Hero>
          <AvatarWrap>
            <Logo size={120} />
          </AvatarWrap>
          <div>
            <Name>About <span>Wintrich.Tech</span></Name>
            <Role>Free network diagnostics — no signup, no clutter</Role>
            <Bio>
              Wintrich.Tech is a fast, browser-based toolkit for checking how your
              websites and servers behave on the public internet. Run a check, read
              the result in plain language, share or export it — that's it.
            </Bio>
          </div>
        </Hero>

        <SectionGrid>
          <Section $delay={0.1}>
            <SectionTitle>What you can check</SectionTitle>
            <Skills>
              <Skill>Reachability (ping)</Skill>
              <Skill>DNS records</Skill>
              <Skill>HTTP response</Skill>
              <Skill>TLS certificates</Skill>
              <Skill>Security headers</Skill>
              <Skill>Full diagnostic</Skill>
            </Skills>
          </Section>

          <Section $delay={0.2}>
            <SectionTitle>Why use it</SectionTitle>
            <p style={{ color: theme.colors.textSecondary, lineHeight: 1.7 }}>
              Every result comes with a plain-language interpretation, so you don't
              need to be a network engineer to act on it. Export results as JSON or
              CSV, or share a deep link with a colleague — no account required.
            </p>
            <ProjectCta to="/dashboard">Open the dashboard →</ProjectCta>
          </Section>

          <Section $delay={0.3}>
            <SectionTitle>Who it's for</SectionTitle>
            <p style={{ color: theme.colors.textSecondary, lineHeight: 1.7 }}>
              Developers verifying a deployment, sysadmins triaging an outage, site
              owners checking their SSL expiry, or anyone who needs a quick,
              trustworthy answer about a domain.
            </p>
          </Section>

          <Section $delay={0.4}>
            <SectionTitle>Privacy</SectionTitle>
            <p style={{ color: theme.colors.textSecondary, lineHeight: 1.7 }}>
              No tracking, no ads, no accounts. Your queries are processed on demand
              and not stored on our servers. History stays in your browser.
            </p>
          </Section>
        </SectionGrid>
      </Wrap>
    </Page>
  );
};
