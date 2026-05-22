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
const SkylineIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V11l3-2v12M11 21V7l3 2v12M17 21V13l3 2v6"/></svg>
);
const HeatIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="10" y="3" width="6" height="6" rx="1"/><rect x="17" y="3" width="4" height="6" rx="1"/><rect x="3" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/><rect x="17" y="10" width="4" height="6" rx="1"/></svg>
);
const WeatherIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="8" cy="10" r="3"/><path d="M14 17h4a3 3 0 000-6 5 5 0 00-9.8-1"/><path d="M7 19l-1 2M11 19l-1 2M15 19l-1 2"/></svg>
);

export const VisualizeTabs: React.FC = () => (
  <Wrap aria-label="Visualization picker">
    <Tab to="/visualize/globe"><GlobeIco /><span className="lbl">Globe</span></Tab>
    <Tab to="/visualize/skyline"><SkylineIco /><span className="lbl">Ports</span></Tab>
    <Tab to="/visualize/traceroute" end><TraceIco /><span className="lbl">Trace</span></Tab>
    <Tab to="/visualize/anycast"><AtlasIco /><span className="lbl">Anycast</span></Tab>
    <Tab to="/visualize/tls"><TlsIco /><span className="lbl">TLS</span></Tab>
    <Tab to="/visualize/heatmap"><HeatIco /><span className="lbl">Heatmap</span></Tab>
    <Tab to="/visualize/weather"><WeatherIco /><span className="lbl">Weather</span></Tab>
  </Wrap>
);
