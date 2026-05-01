/**
 * Lightweight per-tool query history stored in localStorage.
 * Each tool keeps a rolling list of the most recent queries (max 10).
 */

const PREFIX = 'wintrich.history.';
const MAX_ITEMS = 10;

export interface HistoryEntry {
  /** Primary value (host, domain, url) */
  value: string;
  /** Optional secondary value (e.g. TLS port) */
  extra?: string;
  /** ISO timestamp */
  ts: string;
}

const safeStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

export function loadHistory(toolKey: string): HistoryEntry[] {
  const ls = safeStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(PREFIX + toolKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function saveHistory(toolKey: string, entries: HistoryEntry[]): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(PREFIX + toolKey, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / privacy mode — silently ignore */
  }
}

export function addHistoryEntry(toolKey: string, value: string, extra?: string): HistoryEntry[] {
  const trimmed = value.trim();
  if (!trimmed) return loadHistory(toolKey);
  const current = loadHistory(toolKey);
  // de-dupe (case-insensitive on value+extra)
  const filtered = current.filter(
    (e) => e.value.toLowerCase() !== trimmed.toLowerCase() || (e.extra ?? '') !== (extra ?? '')
  );
  const next: HistoryEntry[] = [
    { value: trimmed, extra, ts: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_ITEMS);
  saveHistory(toolKey, next);
  return next;
}

export function clearHistory(toolKey: string): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.removeItem(PREFIX + toolKey);
  } catch {
    /* ignore */
  }
}
