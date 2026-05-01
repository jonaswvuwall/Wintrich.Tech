import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import type { HistoryEntry } from '../../../shared/utils/history';

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: -${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  min-height: 1.6rem;
`;

const Hint = styled.span`
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 0.25rem;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.72rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: ${theme.colors.textSecondary};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  border-radius: 999px;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${theme.colors.text};
    border-color: rgba(34, 211, 238, 0.4);
    background: rgba(34, 211, 238, 0.08);
  }
`;

const ClearBtn = styled.button`
  font-size: 0.7rem;
  color: ${theme.colors.textMuted};
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  margin-left: auto;
  transition: color ${theme.transitions.fast};

  &:hover { color: ${theme.colors.error}; }
`;

interface Props {
  entries: HistoryEntry[];
  onPick: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export const RecentChips: React.FC<Props> = ({ entries, onPick, onClear }) => {
  if (entries.length === 0) return null;
  return (
    <Wrap>
      <Hint>Recent</Hint>
      {entries.slice(0, 5).map((e, i) => (
        <Chip
          key={`${e.value}-${e.extra ?? ''}-${i}`}
          type="button"
          title={`Re-run ${e.value}${e.extra ? ` (${e.extra})` : ''}`}
          onClick={() => onPick(e)}
        >
          {e.value}{e.extra ? `:${e.extra}` : ''}
        </Chip>
      ))}
      <ClearBtn type="button" onClick={onClear} title="Clear history">clear</ClearBtn>
    </Wrap>
  );
};
