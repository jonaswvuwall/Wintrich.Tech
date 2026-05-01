/**
 * Export utilities for diagnostic results.
 * - JSON: pretty-printed dump of the result object.
 * - CSV: flat key/value table.
 * - Share link: builds a deep-link URL that re-runs the same query on /dashboard.
 */

const downloadBlob = (filename: string, mime: string, content: string): void => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const sanitizeFilename = (s: string): string =>
  s.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 60) || 'result';

export function exportJson(toolKey: string, identifier: string, data: unknown): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${toolKey}_${sanitizeFilename(identifier)}_${ts}.json`;
  downloadBlob(filename, 'application/json', JSON.stringify(data, null, 2));
}

const csvEscape = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Flatten an object into a key/value table for CSV output.
 * Arrays become joined with " | ", nested objects are JSON-stringified.
 */
export function exportCsv(toolKey: string, identifier: string, data: Record<string, unknown>): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${toolKey}_${sanitizeFilename(identifier)}_${ts}.csv`;
  const rows: string[] = ['Field,Value'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      rows.push(`${csvEscape(key)},${csvEscape(value.join(' | '))}`);
    } else if (value !== null && typeof value === 'object') {
      // nested object → one row per sub-key
      for (const [k2, v2] of Object.entries(value as Record<string, unknown>)) {
        rows.push(`${csvEscape(`${key}.${k2}`)},${csvEscape(v2)}`);
      }
    } else {
      rows.push(`${csvEscape(key)},${csvEscape(value)}`);
    }
  }
  downloadBlob(filename, 'text/csv;charset=utf-8', rows.join('\n'));
}

/**
 * Build a deep-link URL that re-runs the same query when opened.
 * Format: https://host/dashboard?tool=<toolKey>&q=<value>[&extra=<extra>]
 */
export function buildShareLink(toolKey: string, value: string, extra?: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + '/dashboard');
  url.searchParams.set('tool', toolKey);
  url.searchParams.set('q', value);
  if (extra) url.searchParams.set('extra', extra);
  return url.toString();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
