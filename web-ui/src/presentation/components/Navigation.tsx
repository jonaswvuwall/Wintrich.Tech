import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Logo } from './Logo';

const MOBILE = '640px';

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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
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

  @media (max-width: ${MOBILE}) {
    grid-template-columns: 1fr auto;
    padding: ${p => p.$scrolled ? '0.5rem 0.5rem 0.5rem 0.9rem' : '0.6rem 0.6rem 0.6rem 1rem'};
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
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  white-space: nowrap;

  span.dot {
    background: ${theme.gradients.brand};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
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

  @media (max-width: ${MOBILE}) {
    display: none;
  }
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

/* ---------- Mobile menu ---------- */

const RightSlot = styled.span`
  display: block;

  @media (max-width: ${MOBILE}) {
    display: none;
  }
`;

const Burger = styled.button<{ $open: boolean }>`
  display: none;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.border};
  border-radius: 999px;
  color: ${theme.colors.text};
  cursor: pointer;
  padding: 0;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast};

  &:hover { background: rgba(255, 255, 255, 0.08); }
  &:active { transform: scale(0.96); }

  @media (max-width: ${MOBILE}) {
    display: inline-flex;
  }

  span {
    position: relative;
    width: 18px;
    height: 2px;
    background: currentColor;
    border-radius: 2px;
    transition: transform ${theme.transitions.fast}, background ${theme.transitions.fast};

    &::before, &::after {
      content: '';
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: currentColor;
      border-radius: 2px;
      transition: transform ${theme.transitions.fast}, top ${theme.transitions.fast};
    }
    &::before { top: -6px; }
    &::after  { top:  6px; }
  }

  ${p => p.$open && `
    span { background: transparent; }
    span::before { top: 0; transform: rotate(45deg); }
    span::after  { top: 0; transform: rotate(-45deg); }
  `}
`;

const sheetIn = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`;

const Sheet = styled.div`
  pointer-events: auto;
  position: fixed;
  top: 4.5rem;
  left: ${theme.spacing.md};
  right: ${theme.spacing.md};
  z-index: 999;
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(10, 12, 18, 0.92);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid ${theme.colors.border};
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  transform-origin: top right;
  animation: ${sheetIn} 200ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (max-width: ${MOBILE}) {
    display: flex;
  }
`;

const SheetLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  color: ${p => p.$active ? theme.colors.text : theme.colors.textSecondary};
  background: ${p => p.$active ? theme.gradients.brandSoft : 'transparent'};
  border: 1px solid ${p => p.$active ? 'rgba(34,211,238,0.35)' : 'transparent'};
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:active { background: rgba(255, 255, 255, 0.06); }
`;

const ScrimBackdrop = styled.div`
  pointer-events: auto;
  position: fixed;
  inset: 0;
  z-index: 998;
  display: none;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  animation: fadeIn 200ms ease-out;

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  @media (max-width: ${MOBILE}) {
    display: block;
  }
`;

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Nav $scrolled={scrolled}>
        <Bar $scrolled={scrolled}>
          <Brand to="/" aria-label="Wintrich.Tech home">
            <Mark>
              <Logo size={40} />
            </Mark>
            <Wordmark>
              Wintrich<span className="dot">.Tech</span>
            </Wordmark>
          </Brand>

          <Links>
            <StyledLink to="/" $active={isActive('/')}>Home</StyledLink>
            <StyledLink to="/dashboard" $active={isActive('/dashboard')}>Dashboard</StyledLink>
            <StyledLink to="/monitors" $active={isActive('/monitors')}>Monitors</StyledLink>
            <StyledLink to="/about" $active={isActive('/about')}>About</StyledLink>
          </Links>

          <RightSlot aria-hidden />

          <Burger
            $open={open}
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav-sheet"
            type="button"
          >
            <span />
          </Burger>
        </Bar>
      </Nav>

      {open && (
        <>
          <ScrimBackdrop onClick={() => setOpen(false)} />
          <Sheet id="mobile-nav-sheet" role="menu">
            <SheetLink to="/" $active={isActive('/')} role="menuitem">Home</SheetLink>
            <SheetLink to="/dashboard" $active={isActive('/dashboard')} role="menuitem">Dashboard</SheetLink>
            <SheetLink to="/monitors" $active={isActive('/monitors')} role="menuitem">Monitors</SheetLink>
            <SheetLink to="/about" $active={isActive('/about')} role="menuitem">About</SheetLink>
          </Sheet>
        </>
      )}
    </>
  );
};
