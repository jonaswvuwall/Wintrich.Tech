import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

/* Slim segmented control — consistent across all three Visualize sub-pages.
   Designed to live inside the floating TopBar of each page. */
const Wrap = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.22rem;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.border};
  flex-shrink: 0;

  @media (max-width: 720px) {
    padding: 0.18rem;
    gap: 0.1rem;
  }
`;

const Tab = styled(NavLink)`
  position: relative;
  padding: 0.4rem 0.75rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${theme.colors.textSecondary};
  text-decoration: none;
  border-radius: 8px;
  transition: color 180ms, background 180ms;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  cursor: pointer;

  svg { width: 14px; height: 14px; stroke-width: 2; flex-shrink: 0; }

  &:hover { color: ${theme.colors.text}; }

  &.active {
    background: ${theme.gradients.brandSoft};
    color: ${theme.colors.primary};
    box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.18);
  }

  @media (max-width: 720px) {
    padding: 0.32rem 0.5rem;
    font-size: 0.72rem;
  }
`;

const TraceIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M7.5 10.7L11 7.4M13.5 7.5L16.7 16.7"/></svg>
);
const AtlasIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>
);
const TlsIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
);
const GlobeIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18"/></svg>
);

export const VisualizeTabs: React.FC = () => (
  <Wrap aria-label="Visualization picker">
    <Tab to="/visualize/globe"><GlobeIco /><span className="lbl">Globe</span></Tab>
    <Tab to="/visualize/traceroute" end><TraceIco /><span className="lbl">Trace</span></Tab>
    <Tab to="/visualize/anycast"><AtlasIco /><span className="lbl">Anycast</span></Tab>
    <Tab to="/visualize/tls"><TlsIco /><span className="lbl">TLS</span></Tab>
  </Wrap>
);
