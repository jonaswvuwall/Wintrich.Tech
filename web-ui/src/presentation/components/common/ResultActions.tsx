import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { exportJson, exportCsv, buildShareLink, copyToClipboard } from '../../../shared/utils/export';

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
`;

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.text};
    border-color: rgba(34, 211, 238, 0.4);
    background: rgba(34, 211, 238, 0.08);
    transform: translateY(-1px);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Toast = styled.span`
  font-size: 0.72rem;
  color: ${theme.colors.success};
  padding: 0.4rem 0.6rem;
  align-self: center;
`;

interface Props {
  toolKey: string;
  identifier: string;
  data: Record<string, unknown>;
  shareValue: string;
  shareExtra?: string;
}

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const ResultActions: React.FC<Props> = ({ toolKey, identifier, data, shareValue, shareExtra }) => {
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleShare = async () => {
    const link = buildShareLink(toolKey, shareValue, shareExtra);
    const ok = await copyToClipboard(link);
    flash(ok ? 'Link copied!' : 'Copy failed');
  };

  return (
    <Bar>
      <Action type="button" onClick={() => exportJson(toolKey, identifier, data)} title="Download JSON">
        <IconDownload />
        JSON
      </Action>
      <Action type="button" onClick={() => exportCsv(toolKey, identifier, data)} title="Download CSV">
        <IconDownload />
        CSV
      </Action>
      <Action type="button" onClick={handleShare} title="Copy shareable link">
        <IconShare />
        Share
      </Action>
      {toast && <Toast>{toast}</Toast>}
    </Bar>
  );
};
