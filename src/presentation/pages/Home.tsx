import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { theme } from '../styles/theme';
import {
  AnimatedBackground,
  FloatingShape,
  ParticleContainer,
  Particle,
  GridOverlay,
  BackgroundGlow,
} from '../components/AnimatedBackground';

const HomeContainer = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  position: relative;
  overflow-x: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: 900px;
  padding: ${theme.spacing.xxl};
  text-align: center;

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.lg} ${theme.spacing.md};
  }
`;

const Logo = styled.img`
  width: 120px;
  height: 120px;
  margin-bottom: ${theme.spacing.lg};
  filter: drop-shadow(0 0 30px rgba(0, 168, 232, 0.6));
  animation: float 6s ease-in-out infinite;

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 900;
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
  animation: fadeInScale 1s ease-out, gradientMove 5s ease infinite;
  letter-spacing: -1px;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 2.5rem;
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
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

const Subtitle = styled.p`
  font-size: 1.5rem;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg};
  font-weight: 300;
  line-height: 1.8;
  opacity: 0;
  animation: fadeInUp 1s ease-out 0.3s forwards;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 1.125rem;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 0.9;
      transform: translateY(0);
    }
  }
`;

const Description = styled.p`
  font-size: 1.125rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xxl};
  line-height: 1.8;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  opacity: 0;
  animation: fadeInUp 1s ease-out 0.6s forwards;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  justify-content: center;
  flex-wrap: wrap;
  opacity: 0;
  animation: fadeInUp 1s ease-out 0.9s forwards;
`;

const StyledLink = styled(Link)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${props => props.$primary 
    ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`
    : 'rgba(26, 26, 26, 0.8)'};
  color: ${theme.colors.text};
  text-decoration: none;
  border-radius: ${theme.borderRadius.md};
  font-size: 1.125rem;
  font-weight: 600;
  border: 2px solid ${props => props.$primary ? 'transparent' : theme.colors.primary};
  backdrop-filter: blur(10px);
  transition: all ${theme.transitions.normal};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${props => props.$primary
      ? `0 10px 30px rgba(0, 168, 232, 0.4)`
      : `0 10px 30px rgba(0, 168, 232, 0.2)`};

    &::before {
      width: 300px;
      height: 300px;
    }
  }

  &:active {
    transform: translateY(-1px);
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.xxl};
  opacity: 0;
  animation: fadeInUp 1s ease-out 1.2s forwards;
`;

const FeatureCard = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(26, 26, 26, 0.6);
  border: 1px solid rgba(0, 168, 232, 0.3);
  border-radius: ${theme.borderRadius.md};
  backdrop-filter: blur(10px);
  transition: all ${theme.transitions.normal};

  &:hover {
    transform: translateY(-5px);
    border-color: ${theme.colors.primary};
    box-shadow: 0 10px 30px rgba(0, 168, 232, 0.2);
  }
`;

const FeatureIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${theme.spacing.sm};
`;

const FeatureTitle = styled.h3`
  font-size: 1.125rem;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
  font-weight: 600;
`;

const FeatureDescription = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
`;

export const Home: React.FC = () => {
  return (
    <HomeContainer>
      <AnimatedBackground>
        <BackgroundGlow />
        <GridOverlay />
        <FloatingShape delay={0} duration={20} size={400} />
        <FloatingShape delay={5} duration={25} size={300} />
        <FloatingShape delay={10} duration={30} size={350} />
        <ParticleContainer>
          {[...Array(15)].map((_, i) => (
            <Particle
              key={i}
              delay={i * 0.5}
              duration={15 + Math.random() * 10}
              left={`${Math.random() * 100}%`}
            />
          ))}
        </ParticleContainer>
      </AnimatedBackground>

      <Content>
        <Logo src="/logo.png" alt="Wintrich.tech Logo" />
        <Title>Wintrich.tech</Title>
        <Subtitle>Network Intelligence Platform</Subtitle>
        <Description>
          Advanced network diagnostics and analysis tools designed for developers, 
          system administrators, and network professionals. Test connectivity, 
          analyze DNS records, inspect HTTP responses, and examine TLS certificates 
          with ease.
        </Description>

        <ButtonGroup>
          <StyledLink to="/dashboard" $primary>
            🚀 Launch Dashboard
          </StyledLink>
          <StyledLink to="/about">
            👨‍💻 About Developer
          </StyledLink>
        </ButtonGroup>

        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>🌐</FeatureIcon>
            <FeatureTitle>Connectivity Test</FeatureTitle>
            <FeatureDescription>
              Ping any host and measure latency with detailed statistics
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🔍</FeatureIcon>
            <FeatureTitle>DNS Intelligence</FeatureTitle>
            <FeatureDescription>
              Query DNS records including A, AAAA, MX, NS, and TXT records
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureTitle>HTTP Analysis</FeatureTitle>
            <FeatureDescription>
              Analyze HTTP responses with detailed headers and timing
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🔒</FeatureIcon>
            <FeatureTitle>TLS Inspector</FeatureTitle>
            <FeatureDescription>
              Examine SSL/TLS certificates with expiry information
            </FeatureDescription>
          </FeatureCard>
        </FeatureGrid>
      </Content>
    </HomeContainer>
  );
};
