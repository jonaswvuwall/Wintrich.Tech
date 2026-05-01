import { useCallback, useEffect, useState } from 'react';
import {
  addHistoryEntry,
  clearHistory as clearHistoryStorage,
  loadHistory,
  type HistoryEntry,
} from '../../shared/utils/history';

/**
 * Reactive wrapper around localStorage-backed tool history.
 * Returns the current entries plus mutators (add / clear).
 */
export function useToolHistory(toolKey: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory(toolKey));

  // Re-sync if toolKey changes (defensive — usually static per component)
  useEffect(() => {
    setEntries(loadHistory(toolKey));
  }, [toolKey]);

  const add = useCallback(
    (value: string, extra?: string) => {
      const next = addHistoryEntry(toolKey, value, extra);
      setEntries(next);
    },
    [toolKey]
  );

  const clear = useCallback(() => {
    clearHistoryStorage(toolKey);
    setEntries([]);
  }, [toolKey]);

  return { entries, add, clear };
}
