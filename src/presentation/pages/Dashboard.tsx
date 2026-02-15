import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Header } from '../components/Header';
import { PingTool } from '../components/PingTool';
import { DnsTool } from '../components/DnsTool';
import { HttpTool } from '../components/HttpTool';
import { TlsTool } from '../components/TlsTool';
import { theme } from '../styles/theme';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: ${theme.colors.background};
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md};
  }
`;

const WelcomeSection = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xxl};
  padding: ${theme.spacing.xxl} ${theme.spacing.xl};
  background: linear-gradient(135deg, 
    rgba(0, 168, 232, 0.1) 0%, 
    rgba(0, 119, 182, 0.05) 100%);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md};
  background: linear-gradient(135deg, 
    ${theme.colors.primary} 0%, 
    ${theme.colors.primaryLight} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: 2rem;
  }
`;

const WelcomeText = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: 1.125rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const ToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: ${theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
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
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    // Check API health on mount
    const checkApiHealth = async () => {
      try {
        const response = await fetch('http://localhost:8080/actuator/health');
        setApiOnline(response.ok);
      } catch {
        setApiOnline(false);
      }
    };

    checkApiHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContainer>
      <Header apiOnline={apiOnline} />
      
      <MainContent>
        <WelcomeSection>
          <WelcomeTitle>Network Intelligence Dashboard</WelcomeTitle>
          <WelcomeText>
            Powerful network diagnostics and analysis tools at your fingertips. 
            Test connectivity, query DNS records, analyze HTTP responses, and inspect TLS certificates.
          </WelcomeText>
        </WelcomeSection>

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
    </DashboardContainer>
  );
};
