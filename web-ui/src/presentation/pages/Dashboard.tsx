import React from 'react';
import styled, { keyframes } from 'styled-components';
import { PingTool } from '../components/PingTool';
import { DnsTool } from '../components/DnsTool';
import { HttpTool } from '../components/HttpTool';
import { TlsTool } from '../components/TlsTool';
import { ScrollToTop } from '../components/ScrollToTop';
import { theme } from '../styles/theme';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 4vw, 3rem) clamp(3rem, 6vh, 5rem);
`;

const Header = styled.header`
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
  width: min(1320px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
  gap: 1.5rem;

  > * {
    animation: ${fadeUp} 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  > *:nth-child(1) { animation-delay: 0.05s; }
  > *:nth-child(2) { animation-delay: 0.12s; }
  > *:nth-child(3) { animation-delay: 0.19s; }
  > *:nth-child(4) { animation-delay: 0.26s; }
`;

const Footer = styled.footer`
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
      <Header>
        <div>
          <Eyebrow>Diagnostics console</Eyebrow>
          <Title>
            Network <span className="grad">Intelligence</span>
          </Title>
          <Sub>
            A unified surface for ping, DNS, HTTP and TLS — designed for fast, precise inspection.
          </Sub>
        </div>
        <TopMeta>
          <MetaPill>API <b>online</b></MetaPill>
          <MetaPill $color={theme.colors.primary}><b>4</b> tools active</MetaPill>
        </TopMeta>
      </Header>

      <Grid>
        <PingTool />
        <DnsTool />
        <HttpTool />
        <TlsTool />
      </Grid>

      <Footer>
        <span>© 2026 Wintrich.Tech — Network Intelligence</span>
        <span>React · TypeScript · ASP.NET Core</span>
      </Footer>

      <ScrollToTop />
    </Page>
  );
};
