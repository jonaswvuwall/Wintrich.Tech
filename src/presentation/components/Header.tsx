import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const HeaderContainer = styled.header`
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: ${theme.shadows.md};
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const Logo = styled.img`
  height: 40px;
  width: auto;
  filter: drop-shadow(${theme.shadows.glow});
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const Subtitle = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: 0.875rem;
  font-weight: 400;
  margin-left: ${theme.spacing.sm};
`;

const StatusBadge = styled.div<{ online: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.online ? 'rgba(6, 214, 160, 0.1)' : 'rgba(239, 71, 111, 0.1)'};
  border: 1px solid ${props => props.online ? theme.colors.success : theme.colors.error};
  border-radius: ${theme.borderRadius.md};
  color: ${props => props.online ? theme.colors.success : theme.colors.error};
  font-size: 0.875rem;
  font-weight: 500;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.online ? theme.colors.success : theme.colors.error};
    animation: ${props => props.online ? 'pulse 2s infinite' : 'none'};
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

interface HeaderProps {
  apiOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({ apiOnline }) => {
  return (
    <HeaderContainer>
      <LogoSection>
        <Logo src="/logo.png" alt="Wintrich.tech Logo" onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.style.display = 'none';
        }} />
        <div>
          <Title>
            Wintrich.tech
            <Subtitle>Network Intelligence</Subtitle>
          </Title>
        </div>
      </LogoSection>
      <StatusBadge online={apiOnline}>
        {apiOnline ? 'API Online' : 'API Offline'}
      </StatusBadge>
    </HeaderContainer>
  );
};
