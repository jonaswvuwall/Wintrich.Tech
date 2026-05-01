import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Logo } from '../components/Logo';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 5vw, 4rem) clamp(3rem, 6vh, 5rem);
`;

const Wrap = styled.div`
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

const Socials = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-top: 1.4rem;
  flex-wrap: wrap;

  @media (max-width: 720px) { justify-content: center; }
`;

const Social = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  text-decoration: none;
  color: ${theme.colors.text};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.border};
  font-size: 0.85rem;
  font-weight: 500;
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 211, 238, 0.5);
    background: rgba(34, 211, 238, 0.08);
  }
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
      <Wrap>
        <Back to="/">← Back home</Back>

        <Hero>
          <AvatarWrap>
            <Logo size={120} />
          </AvatarWrap>
          <div>
            <Name>Jonas <span>Wintrich</span></Name>
            <Role>Full-stack developer · Network engineer</Role>
            <Bio>
              I build robust network intelligence tools and full-stack applications.
              Strong background in C#, ASP.NET Core, React and modern web tooling, with a focus on
              clean architecture, security, and performance.
            </Bio>
            <Socials>
              <Social
                href="https://www.linkedin.com/in/jonas-wintrich-a31bb61ba/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn ↗
              </Social>
            </Socials>
          </div>
        </Hero>

        <SectionGrid>
          <Section $delay={0.1}>
            <SectionTitle>Stack</SectionTitle>
            <Skills>
              <Skill>C#</Skill>
              <Skill>ASP.NET Core</Skill>
              <Skill>React</Skill>
              <Skill>TypeScript</Skill>
              <Skill>Node.js</Skill>
              <Skill>PostgreSQL</Skill>
              <Skill>Docker</Skill>
              <Skill>REST · OpenAPI</Skill>
              <Skill>Networking</Skill>
            </Skills>
          </Section>

          <Section $delay={0.2}>
            <SectionTitle>About this project</SectionTitle>
            <p style={{ color: theme.colors.textSecondary, lineHeight: 1.7 }}>
              Wintrich.Tech is a network diagnostics platform — an ASP.NET Core backend with
              SSRF-hardened endpoints, rate limiting and caching, paired with a styled-components
              React frontend. Use the dashboard to test connectivity, resolve DNS, inspect HTTP
              responses, and audit TLS certificates.
            </p>
            <ProjectCta to="/dashboard">Try the dashboard →</ProjectCta>
          </Section>
        </SectionGrid>
      </Wrap>
    </Page>
  );
};
