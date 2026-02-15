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

const AboutContainer = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
  position: relative;
  overflow-x: hidden;
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1000px;
  margin: 0 auto;
  padding: ${theme.spacing.xxl};

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.lg} ${theme.spacing.md};
  }
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.primary};
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: ${theme.spacing.xl};
  transition: all ${theme.transitions.normal};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.sm};

  &:hover {
    transform: translateX(-5px);
    background: rgba(0, 168, 232, 0.1);
  }
`;

const ProfileSection = styled.div`
  display: flex;
  gap: ${theme.spacing.xxl};
  align-items: flex-start;
  margin-bottom: ${theme.spacing.xxl};
  padding: ${theme.spacing.xxl};
  background: rgba(26, 26, 26, 0.8);
  border: 2px solid rgba(0, 168, 232, 0.3);
  border-radius: ${theme.borderRadius.lg};
  backdrop-filter: blur(10px);
  animation: fadeInUp 0.8s ease-out;

  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    text-align: center;
    align-items: center;
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
`;

const ProfileImage = styled.div`
  width: 180px;
  height: 180px;
  min-width: 180px;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight});
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  box-shadow: 0 10px 40px rgba(0, 168, 232, 0.4);
  animation: float 6s ease-in-out infinite;

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const Name = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: ${theme.spacing.sm};
  background: linear-gradient(
    135deg,
    ${theme.colors.primary},
    ${theme.colors.primaryLight}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 2rem;
  }
`;

const Role = styled.h2`
  font-size: 1.5rem;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  font-weight: 600;
  opacity: 0.9;
`;

const Bio = styled.p`
  font-size: 1.125rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.8;
  margin-bottom: ${theme.spacing.lg};
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.tablet}) {
    justify-content: center;
  }
`;

const SocialLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: rgba(0, 168, 232, 0.1);
  color: ${theme.colors.primary};
  text-decoration: none;
  border-radius: ${theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid ${theme.colors.primary};
  transition: all ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.primary};
    color: ${theme.colors.background};
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(0, 168, 232, 0.4);
  }
`;

const SectionTitle = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: ${theme.spacing.lg};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  &::before {
    content: '';
    width: 4px;
    height: 2rem;
    background: linear-gradient(180deg, ${theme.colors.primary}, ${theme.colors.primaryLight});
    border-radius: 2px;
  }
`;

const Section = styled.section<{ delay?: string }>`
  margin-bottom: ${theme.spacing.xxl};
  padding: ${theme.spacing.xl};
  background: rgba(26, 26, 26, 0.6);
  border: 1px solid rgba(0, 168, 232, 0.2);
  border-radius: ${theme.borderRadius.lg};
  backdrop-filter: blur(10px);
  animation: fadeInUp 0.8s ease-out;
  animation-delay: ${props => props.delay || '0s'};
  opacity: 0;
  animation-fill-mode: forwards;
`;

const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

const SkillCard = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(0, 168, 232, 0.05);
  border: 1px solid rgba(0, 168, 232, 0.3);
  border-radius: ${theme.borderRadius.sm};
  text-align: center;
  transition: all ${theme.transitions.normal};

  &:hover {
    background: rgba(0, 168, 232, 0.1);
    border-color: ${theme.colors.primary};
    transform: translateY(-3px);
  }
`;

const SkillIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${theme.spacing.xs};
`;

const SkillName = styled.div`
  color: ${theme.colors.text};
  font-weight: 600;
  font-size: 1rem;
`;

const ProjectLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight});
  color: ${theme.colors.text};
  text-decoration: none;
  border-radius: ${theme.borderRadius.md};
  font-size: 1.125rem;
  font-weight: 600;
  transition: all ${theme.transitions.normal};
  margin-top: ${theme.spacing.lg};

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(0, 168, 232, 0.4);
  }
`;

export const About: React.FC = () => {
  return (
    <AboutContainer>
      <AnimatedBackground>
        <BackgroundGlow />
        <GridOverlay />
        <FloatingShape delay={0} duration={20} size={400} />
        <FloatingShape delay={5} duration={25} size={300} />
        <ParticleContainer>
          {[...Array(10)].map((_, i) => (
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
        <BackButton to="/">
          ← Back to Home
        </BackButton>

        <ProfileSection>
          <ProfileImage>👨‍💻</ProfileImage>
          <ProfileInfo>
            <Name>Jonas Wintrich</Name>
            <Role>Full-Stack Developer & Network Engineer</Role>
            <Bio>
              Passionate developer specializing in building robust network intelligence 
              tools and full-stack applications. Experienced in Java, Spring Boot, 
              React, and modern web technologies. Dedicated to creating efficient, 
              scalable solutions for complex technical challenges.
            </Bio>
            <SocialLinks>
              <SocialLink 
                href="https://www.linkedin.com/in/jonas-wintrich-a31bb61ba/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                🔗 LinkedIn Profile
              </SocialLink>
            </SocialLinks>
          </ProfileInfo>
        </ProfileSection>

        <Section delay="0.2s">
          <SectionTitle>Technical Skills</SectionTitle>
          <SkillsGrid>
            <SkillCard>
              <SkillIcon>☕</SkillIcon>
              <SkillName>Java & Spring Boot</SkillName>
            </SkillCard>
            <SkillCard>
              <SkillIcon>⚛️</SkillIcon>
              <SkillName>React & TypeScript</SkillName>
            </SkillCard>
            <SkillCard>
              <SkillIcon>🌐</SkillIcon>
              <SkillName>Network Engineering</SkillName>
            </SkillCard>
            <SkillCard>
              <SkillIcon>🔧</SkillIcon>
              <SkillName>REST API Design</SkillName>
            </SkillCard>
            <SkillCard>
              <SkillIcon>🐳</SkillIcon>
              <SkillName>Docker & DevOps</SkillName>
            </SkillCard>
            <SkillCard>
              <SkillIcon>🗄️</SkillIcon>
              <SkillName>Database Systems</SkillName>
            </SkillCard>
          </SkillsGrid>
        </Section>

        <Section delay="0.4s">
          <SectionTitle>About This Project</SectionTitle>
          <Bio>
            The Network Intelligence API is a comprehensive platform that combines 
            powerful backend services built with Spring Boot and a modern React frontend. 
            It provides professional-grade network diagnostic tools including connectivity 
            testing, DNS analysis, HTTP inspection, and TLS certificate examination.
          </Bio>
          <Bio>
            The project demonstrates clean architecture principles, security best practices 
            with SSRF protection and rate limiting, performance optimization through caching, 
            and a beautiful, animated user interface built with styled-components.
          </Bio>
          <ProjectLink to="/dashboard">
            🚀 Try the Dashboard
          </ProjectLink>
        </Section>
      </Content>
    </AboutContainer>
  );
};
