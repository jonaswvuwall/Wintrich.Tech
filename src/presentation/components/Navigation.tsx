import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Logo } from './Logo';

const Nav = styled.nav<{ $scrolled: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: padding ${theme.transitions.normal};

  ${p => p.$scrolled && `padding-top: ${theme.spacing.sm};`}

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const Bar = styled.div<{ $scrolled: boolean }>`
  pointer-events: auto;
  width: min(1320px, 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${p => p.$scrolled ? '0.55rem 0.75rem 0.55rem 1.1rem' : '0.7rem 0.85rem 0.7rem 1.25rem'};
  background: ${p => p.$scrolled ? 'rgba(10, 12, 18, 0.72)' : 'rgba(10, 12, 18, 0.45)'};
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid ${theme.colors.border};
  border-radius: 999px;
  box-shadow: ${p => p.$scrolled ? '0 12px 40px rgba(0,0,0,0.4)' : '0 8px 28px rgba(0,0,0,0.3)'};
  transition: all ${theme.transitions.normal};
  animation: navIn 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes navIn {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  color: ${theme.colors.text};
  padding-right: ${theme.spacing.sm};

  &:hover .wt-mark { transform: rotate(-6deg) scale(1.05); }
`;

const Mark = styled.span.attrs({ className: 'wt-mark' })`
  display: inline-flex;
  transition: transform ${theme.transitions.normal};
`;

const Wordmark = styled.span`
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.02rem;
  letter-spacing: -0.01em;
  white-space: nowrap;

  span.dot {
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 480px) {
    display: none;
  }
`;

const Links = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  border-radius: 999px;
`;

const StyledLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  color: ${p => p.$active ? theme.colors.text : theme.colors.textSecondary};
  background: ${p => p.$active ? theme.gradients.brandSoft : 'transparent'};
  border: 1px solid ${p => p.$active ? 'rgba(34,211,238,0.35)' : 'transparent'};
  transition: all ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.text};
    background: ${p => p.$active ? theme.gradients.brandSoft : 'rgba(255, 255, 255, 0.05)'};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 0.45rem 0.75rem;
    font-size: 0.8125rem;
  }
`;

const CtaWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  @media (max-width: 640px) {
    display: none;
  }
`;

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  color: #06070C;
  background: ${theme.gradients.brand};
  box-shadow: 0 6px 20px rgba(34, 211, 238, 0.35);
  transition: all ${theme.transitions.fast};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(167, 139, 250, 0.45);
  }
`;

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Nav $scrolled={scrolled}>
      <Bar $scrolled={scrolled}>
        <Brand to="/" aria-label="Wintrich.Tech home">
          <Mark>
            <Logo size={32} />
          </Mark>
          <Wordmark>
            Wintrich<span className="dot">.Tech</span>
          </Wordmark>
        </Brand>

        <Links>
          <StyledLink to="/" $active={location.pathname === '/'}>Home</StyledLink>
          <StyledLink to="/dashboard" $active={location.pathname === '/dashboard'}>Dashboard</StyledLink>
          <StyledLink to="/about" $active={location.pathname === '/about'}>About</StyledLink>
        </Links>

        <CtaWrap>
          <Cta to="/dashboard">Launch →</Cta>
        </CtaWrap>
      </Bar>
    </Nav>
  );
};
