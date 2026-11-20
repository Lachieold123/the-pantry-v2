// What the server accepts, checked before sending, and how a change is
// stamped so it beats what this phone has already seen. One row the server
// refuses used to hold up every change behind it for good (BUG-03); a phone
// whose clock ran slow used to lose its own newer edit (BUG-17).
import { rowId, type Row } from './types';

/** The server's caps (supabase/migrations): a key of 1 to 200 characters, and data under 64 KB. */
export const MAX_ROW_KEY = 200;
/** Measured as JSON text, a little under the server's 64 KB so the stored form always fits. */
export const MAX_ROW_DATA = 60_000;

function byteLength(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c < 0xdc00 ? 2 : 3; // A surrogate pair is 4 bytes, 2 per half.
  }
  return n;
}

/** Whether the server will take this row. A row that won't is set aside, never sent. */
export function rowFits(row: Row): boolean {
  if (row.key.length < 1 || row.key.length > MAX_ROW_KEY) return false;
  if (row.data === null || row.data === undefined) return true;
  try {
    return byteLength(JSON.stringify(row.data)) < MAX_ROW_DATA;
  } catch {
    return false;
  }
}

/**
 * Stamps new rows after anything this phone has already seen for the same
 * record, so a change made here always wins over the version it replaced,
 * whatever the clocks say. The server also refuses stamps far in the future
 * (SEC-04), so one fast clock can't freeze a row.
 */
export function stampAfter(rows: readonly Row[], seen: Readonly<Record<string, Row>>): Row[] {
  return rows.map((r) => {
    const before = seen[rowId(r.kind, r.key)];
    return before && before.updatedAt >= r.updatedAt ? { ...r, updatedAt: before.updatedAt + 1 } : r;
  });
}

/**
 * A kitchen row from a week the plan has already pruned (D-009: eight weeks
 * back). The plan drops those weeks at start-up, but a household's next
 * rebuild from its rows used to bring them back, and the mirror kept growing
 * towards Android's storage limit (audit, performance). Such rows are left
 * out of the mirror; the server still keeps them.
 */
export function isPastKeeping(row: Row, cutoff: string): boolean {
  const data = row.data as Record<string, unknown> | null;
  if (row.kind === 'plan') return typeof data?.day === 'string' && data.day < cutoff;
  if (row.kind === 'extra') return typeof data?.week === 'string' && data.week < cutoff;
  if (row.kind === 'tick' || row.kind === 'removal') {
    const week = row.key.slice(0, row.key.indexOf('|'));
    return /^\d{4}-\d{2}-\d{2}$/.test(week) && week < cutoff;
  }
  return false;
}
