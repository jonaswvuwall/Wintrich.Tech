import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const MOBILE = '720px';

/* ─────────────────────────────────────────────────────────────────
   Icons
   ───────────────────────────────────────────────────────────────── */
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
const FlapIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 16c3-5 6 2 9-3s6 4 9-1"/><path d="M3 8c3 5 6-2 9 3s6-4 9 1" opacity="0.55"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
);

/* ─────────────────────────────────────────────────────────────────
   Single source of truth for tab order/labels
   ───────────────────────────────────────────────────────────────── */
interface TabDef {
  to: string;
  label: string;
  end?: boolean;
  Icon: React.FC;
}

const TABS: TabDef[] = [
  { to: '/visualize/globe',      label: 'Globe',   Icon: GlobeIco },
  { to: '/visualize/skyline',    label: 'Ports',   Icon: SkylineIco },
  { to: '/visualize/traceroute', label: 'Trace',   Icon: TraceIco, end: true },
  { to: '/visualize/anycast',    label: 'Anycast', Icon: AtlasIco },
  { to: '/visualize/tls',        label: 'TLS',     Icon: TlsIco },
  { to: '/visualize/heatmap',    label: 'Heatmap', Icon: HeatIco },
  { to: '/visualize/weather',    label: 'Weather', Icon: WeatherIco },
  { to: '/visualize/flap',       label: 'Flap',    Icon: FlapIco },
];

/* ─────────────────────────────────────────────────────────────────
   Desktop: segmented control
   ───────────────────────────────────────────────────────────────── */
const Wrap = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.22rem;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${MOBILE}) { display: none; }
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
`;

/* ─────────────────────────────────────────────────────────────────
   Mobile: dropdown trigger + sheet
   ───────────────────────────────────────────────────────────────── */
const MobileWrap = styled.div`
  display: none;
  position: relative;
  flex-shrink: 0;

  @media (max-width: ${MOBILE}) { display: inline-flex; }
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 36px;
  padding: 0 0.7rem 0 0.75rem;
  border-radius: 10px;
  background: ${p => p.$open ? theme.gradients.brandSoft : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${p => p.$open ? 'rgba(34,211,238,0.40)' : theme.colors.border};
  color: ${p => p.$open ? theme.colors.primary : theme.colors.text};
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 180ms, border-color 180ms, color 180ms;

  svg.icon { width: 14px; height: 14px; stroke-width: 2; flex-shrink: 0; }
  svg.chev {
    width: 11px; height: 11px;
    margin-left: 0.1rem;
    opacity: 0.65;
    transition: transform 180ms;
    transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  }

  &:hover { border-color: rgba(34, 211, 238, 0.4); }
`;

const sheetSlide = `
  @keyframes wt-vis-sheet-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
`;

const Sheet = styled.div`
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.3rem;
  min-width: 180px;
  background: rgba(10, 12, 18, 0.94);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.55);
  transform-origin: top left;
  ${sheetSlide}
  animation: wt-vis-sheet-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const SheetLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none;
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  transition: background 150ms, color 150ms;

  svg { width: 14px; height: 14px; stroke-width: 2; flex-shrink: 0; }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.text};
  }

  &.active {
    background: ${theme.gradients.brandSoft};
    color: ${theme.colors.primary};
  }
`;

const ChevDown: React.FC = () => (
  <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4.5L6 7.5L9 4.5" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────── */
export const VisualizeTabs: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const active =
    TABS.find(t => (t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)))
    ?? TABS[0];

  /* Close on route change */
  useEffect(() => { setOpen(false); }, [location.pathname]);

  /* Close on outside click or Escape */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ActiveIcon = active.Icon;

  return (
    <>
      <Wrap aria-label="Visualization picker">
        {TABS.map(t => {
          const Ico = t.Icon;
          return (
            <Tab key={t.to} to={t.to} end={t.end}>
              <Ico />
              <span className="lbl">{t.label}</span>
            </Tab>
          );
        })}
      </Wrap>

      <MobileWrap ref={wrapRef}>
        <Trigger
          $open={open}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Visualization: ${active.label}`}
          type="button"
        >
          <ActiveIcon />
          <span>{active.label}</span>
          <ChevDown />
        </Trigger>
        {open && (
          <Sheet role="menu">
            {TABS.map(t => {
              const Ico = t.Icon;
              return (
                <SheetLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <Ico />
                  <span>{t.label}</span>
                </SheetLink>
              );
            })}
          </Sheet>
        )}
      </MobileWrap>
    </>
  );
};
