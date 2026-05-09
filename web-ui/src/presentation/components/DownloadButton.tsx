import React, { useState } from 'react';
import styled from 'styled-components';
import { toPng } from 'html-to-image';
import { theme } from '../styles/theme';

/* ─────────────────────────────────────────────────────────────────
   DownloadButton — captures a visualization element as a PNG and
   triggers a browser download. Works with WebGL canvases (provided
   preserveDrawingBuffer is enabled), Leaflet maps, SVG, and plain
   DOM. Designed to slot into the floating TopBar of each Visualize
   sub-page next to the run button.
   ───────────────────────────────────────────────────────────────── */

const Btn = styled.button`
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid ${theme.colors.border};
  background: rgba(255, 255, 255, 0.04);
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: color 180ms, background 180ms, border-color 180ms, box-shadow 180ms;

  svg { width: 16px; height: 16px; stroke-width: 2; }

  &:hover:not(:disabled) {
    color: ${theme.colors.primary};
    border-color: rgba(34, 211, 238, 0.45);
    background: rgba(34, 211, 238, 0.08);
    box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.25), 0 4px 14px rgba(34, 211, 238, 0.15);
  }

  &:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 560px) { width: 36px; height: 36px; }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(34, 211, 238, 0.25);
  border-top-color: ${theme.colors.primary};
  animation: dl-spin 0.7s linear infinite;
  @keyframes dl-spin { to { transform: rotate(360deg); } }
`;

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 19h14" />
  </svg>
);

const sanitize = (s: string): string =>
  s.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'visualization';

const triggerDownload = (dataUrl: string, filename: string): void => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export type DownloadButtonProps = {
  /** Returns the DOM node to capture, or null if not ready yet. */
  getTarget: () => HTMLElement | null;
  /** Base filename (without extension). A timestamp is appended. */
  filename: string;
  disabled?: boolean;
  title?: string;
};

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  getTarget,
  filename,
  disabled = false,
  title = 'Download as PNG',
}) => {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    const node = getTarget();
    if (!node) return;
    setBusy(true);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fname = `${sanitize(filename)}-${ts}.png`;

      // Fast path: if the target is itself a single canvas, prefer the
      // direct toDataURL path — sharper and avoids html-to-image's clone
      // overhead. Falls back to html-to-image on tainted canvases.
      if (node instanceof HTMLCanvasElement) {
        try {
          triggerDownload(node.toDataURL('image/png'), fname);
          return;
        } catch {
          /* fall through to html-to-image */
        }
      }

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: '#06070C',
        // Skip embedding webfonts: they sometimes 404 on Google Fonts
        // CSS endpoints from the inlining fetch, which would abort the
        // capture. The system fallback renders fine for the screenshot.
        skipFonts: true,
        filter: (n) => {
          // Exclude floating UI controls so they don't appear in the
          // exported image (TopBar, side panels, hints, error banners,
          // ScrollToTop, the download button itself).
          if (!(n instanceof HTMLElement)) return true;
          return n.dataset.exportExclude !== 'true';
        },
      });
      triggerDownload(dataUrl, fname);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Visualization download failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Btn
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      title={title}
      aria-label={title}
      data-export-exclude="true"
    >
      {busy ? <Spinner /> : <DownloadIcon />}
    </Btn>
  );
};
