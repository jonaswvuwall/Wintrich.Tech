import React from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../styles/theme';

const Nav = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 168, 232, 0.2);
  animation: slideDown 0.5s ease-out;

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }
`;

const NavContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md};
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.colors.text};
  transition: all ${theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
    color: ${theme.colors.primary};
  }
`;

const LogoIcon = styled.span`
  font-size: 1.5rem;
`;

const NavLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;

  @media (max-width: ${theme.breakpoints.mobile}) {
    gap: ${theme.spacing.sm};
  }
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  color: ${props => props.$isActive ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  border-radius: ${theme.borderRadius.sm};
  border: 2px solid ${props => props.$isActive ? theme.colors.primary : 'transparent'};
  background: ${props => props.$isActive ? 'rgba(0, 168, 232, 0.1)' : 'transparent'};
  transition: all ${theme.transitions.normal};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 80%;
    height: 2px;
    background: ${theme.colors.primary};
    transition: transform ${theme.transitions.normal};
  }

  &:hover {
    color: ${theme.colors.primary};
    background: rgba(0, 168, 232, 0.1);
    
    &::after {
      transform: translateX(-50%) scaleX(1);
    }
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: 0.875rem;
  }
`;

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <Nav>
      <NavContent>
        <Logo to="/">
          <LogoIcon>🌐</LogoIcon>
          <span>Wintrich.tech</span>
        </Logo>
        <NavLinks>
          <NavLink to="/" $isActive={location.pathname === '/'}>
            Home
          </NavLink>
          <NavLink to="/dashboard" $isActive={location.pathname === '/dashboard'}>
            Dashboard
          </NavLink>
          <NavLink to="/about" $isActive={location.pathname === '/about'}>
            About
          </NavLink>
        </NavLinks>
      </NavContent>
    </Nav>
  );
};
