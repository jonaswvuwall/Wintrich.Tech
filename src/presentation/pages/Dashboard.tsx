import React from 'react';
import styled from 'styled-components';
import { PingTool } from '../components/PingTool';
import { DnsTool } from '../components/DnsTool';
import { HttpTool } from '../components/HttpTool';
import { TlsTool } from '../components/TlsTool';
import { ScrollToTop } from '../components/ScrollToTop';
import {
  AnimatedBackground,
  FloatingShape,
  ParticleContainer,
  Particle,
  GridOverlay,
  BackgroundGlow,
} from '../components/AnimatedBackground';
import { theme } from '../styles/theme';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  position: relative;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding-top: 70px;
`;

const MainContent = styled.main`
  position: relative;
  z-index: 1;
  max-width: 1600px;
  margin: 0 auto;
  padding: ${theme.spacing.xl} ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.lg} ${theme.spacing.md};
  }
`;

const WelcomeSection = styled.section`
  text-align: center;
  padding: ${theme.spacing.xxl} ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  background: linear-gradient(
    135deg,
    rgba(0, 168, 232, 0.15) 0%,
    rgba(0, 168, 232, 0.1) 50%,
    rgba(0, 168, 232, 0.15) 100%
  );
  border: 2px solid rgba(0, 168, 232, 0.3);
  border-radius: ${theme.borderRadius.lg};
  backdrop-filter: blur(20px);
  animation: fadeInUp 0.8s ease-out;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 168, 232, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${theme.colors.primary} 20%,
      ${theme.colors.primaryLight} 50%,
      ${theme.colors.primary} 80%,
      transparent 100%
    );
    animation: shimmer 3s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${theme.colors.primary} 20%,
      ${theme.colors.primaryLight} 50%,
      ${theme.colors.primary} 80%,
      transparent 100%
    );
    animation: shimmer 3s ease-in-out infinite reverse;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    0%, 100% {
      opacity: 0.5;
      background-position: -200% 0;
    }
    50% {
      opacity: 1;
      background-position: 200% 0;
    }
  }
`;

const WelcomeTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: ${theme.spacing.md};
  background: linear-gradient(
    135deg,
    ${theme.colors.primary},
    ${theme.colors.primaryLight},
    ${theme.colors.primary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: fadeIn 1s ease-out, gradientMove 5s ease infinite;
  letter-spacing: -0.5px;
  text-shadow: 0 0 40px rgba(0, 168, 232, 0.3);

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 2.5rem;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes gradientMove {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const WelcomeText = styled.p`
  color: ${theme.colors.text};
  font-size: 1.25rem;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.8;
  font-weight: 300;
  opacity: 0.9;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 168, 232, 0.3) 50%,
    transparent 100%
  );
  margin: ${theme.spacing.xxl} auto;
  max-width: 600px;
  position: relative;

  &::after {
    content: '◆';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${theme.colors.primary};
    background: ${theme.colors.background};
    padding: 0 ${theme.spacing.md};
    font-size: 0.75rem;
  }
`;

const ToolsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  > div {
    animation: slideInUp 0.6s ease-out backwards;
    
    &:nth-child(1) {
      animation-delay: 0.1s;
    }
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
    &:nth-child(4) {
      animation-delay: 0.4s;
    }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  border-top: 1px solid ${theme.colors.border};
  margin-top: ${theme.spacing.xxl};
`;

export const Dashboard: React.FC = () => {

  return (
    <DashboardContainer>
      <AnimatedBackground>
        <BackgroundGlow />
        <GridOverlay />
        <FloatingShape delay={0} duration={20} size={400} />
        <FloatingShape delay={5} duration={25} size={300} />
        <FloatingShape delay={10} duration={30} size={350} />
        <FloatingShape delay={15} duration={22} size={250} />
        <ParticleContainer>
          {[...Array(20)].map((_, i) => (
            <Particle
              key={i}
              delay={i * 0.5}
              duration={15 + Math.random() * 10}
              left={`${Math.random() * 100}%`}
            />
          ))}
        </ParticleContainer>
      </AnimatedBackground>

      <MainContent>
        <WelcomeSection>
          <WelcomeTitle>Network Intelligence Dashboard</WelcomeTitle>
          <WelcomeText>
            Powerful network diagnostics and analysis tools at your fingertips.
            Test connectivity, query DNS records, analyze HTTP responses, and inspect TLS certificates.
          </WelcomeText>
        </WelcomeSection>

        <SectionDivider />

        <ToolsGrid>
          <PingTool />
          <DnsTool />
          <HttpTool />
          <TlsTool />
        </ToolsGrid>

        <Footer>
          <div>© 2026 Wintrich.tech - Network Intelligence API</div>
          <div style={{ marginTop: theme.spacing.sm }}>
            Built with React, TypeScript, and Spring Boot
          </div>
        </Footer>
      </MainContent>

      <ScrollToTop />
    </DashboardContainer>
  );
};
