import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../styles/theme';

/* ─────────────────────────────────────────────────────────────────
   InfoButton — a small (i) icon in the visualization top bar that
   opens a glassy popover explaining how that page's data is
   fetched and interpreted.  Designed to slot in next to the
   DownloadButton.
   ───────────────────────────────────────────────────────────────── */

const sheetIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`;

const Wrap = styled.div`
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
`;

const Btn = styled.button<{ $open: boolean }>`
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid ${p => p.$open ? 'rgba(34,211,238,0.45)' : theme.colors.border};
  background: ${p => p.$open ? theme.gradients.brandSoft : 'rgba(255, 255, 255, 0.04)'};
  color: ${p => p.$open ? theme.colors.primary : theme.colors.textSecondary};
  cursor: pointer;
  transition: color 180ms, background 180ms, border-color 180ms, box-shadow 180ms;

  svg { width: 16px; height: 16px; stroke-width: 2; }

  &:hover {
    color: ${theme.colors.primary};
    border-color: rgba(34, 211, 238, 0.45);
    background: rgba(34, 211, 238, 0.08);
    box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.25), 0 4px 14px rgba(34, 211, 238, 0.15);
  }

  @media (max-width: 560px) { width: 36px; height: 36px; }
`;

const Sheet = styled.div`
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 1200;
  width: min(360px, 86vw);
  padding: 0.9rem 1rem 0.95rem;
  background: rgba(10, 12, 18, 0.96);
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.55);
  animation: ${sheetIn} 180ms cubic-bezier(0.22, 1, 0.36, 1);

  &::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    padding: 1px; background: ${theme.gradients.glassBorder};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0.5; pointer-events: none;
  }
`;

const SheetTitle = styled.h4`
  margin: 0 0 0.5rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${theme.colors.primary};
`;

const SheetBody = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.55;

  p { margin: 0 0 0.5rem; }
  p:last-child { margin: 0; }
  code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.05rem 0.32rem;
    border-radius: 4px;
    color: ${theme.colors.text};
  }
  b, strong { color: ${theme.colors.text}; font-weight: 600; }
`;

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h0" />
    <path d="M11 11h1v6h1" />
  </svg>
);

export interface InfoButtonProps {
  title?: string;
  children: React.ReactNode;
}

export const InfoButton: React.FC<InfoButtonProps> = ({ title = 'How this works', children }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  return (
    <Wrap ref={wrapRef} data-export-exclude="true">
      <Btn
        type="button"
        $open={open}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={title}
      >
        <InfoIcon />
      </Btn>
      {open && (
        <Sheet role="dialog" aria-label={title}>
          <SheetTitle>{title}</SheetTitle>
          <SheetBody>{children}</SheetBody>
        </Sheet>
      )}
    </Wrap>
  );
};
