// Reading a saved store back from disk. A saved blob can be corrupt (a crash
// mid-write, storage full, a bad migration in an old build). The original app
// treated that as "no data" and then overwrote it, losing everything (audit
// ARCH-6, PERF-6). Here a bad blob is set aside under a backup key first, and
// the store starts empty rather than hanging or crashing.

export type Saved = { state: Record<string, unknown>; version?: number };

export type ReadResult = { saved: Saved | null; problem?: 'unreadable' | 'wrong-shape' };

/** Parses a saved blob. Never throws. */
export function readSaved(raw: string | null): ReadResult {
  if (raw === null || raw === '') return { saved: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { saved: null, problem: 'unreadable' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { saved: null, problem: 'wrong-shape' };
  const { state, version } = parsed as { state?: unknown; version?: unknown };
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return { saved: null, problem: 'wrong-shape' };
  if (version !== undefined && typeof version !== 'number') return { saved: null, problem: 'wrong-shape' };
  return {
    saved: version === undefined ? { state: state as Record<string, unknown> } : { state: state as Record<string, unknown>, version },
  };
}

/** Where a bad blob is kept, so it can be recovered by hand or by a later build. */
export function backupKey(name: string, at: number): string {
  return `${name}.corrupt.${at}`;
}

/** How many backups each store keeps. A blob that keeps going bad mustn't fill the phone (audit F218). */
export const BACKUPS_KEPT = 3;

/** The backups of `name` to delete so that, with one more added, only the newest `BACKUPS_KEPT` remain. */
export function backupsToPrune(keys: readonly string[], name: string): string[] {
  const prefix = `${name}.corrupt.`;
  const mine = keys
    .filter((k) => k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length)))
    .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
  return mine.slice(BACKUPS_KEPT - 1);
}

/** True when the blob was saved by a newer build than this one, which must not overwrite it (audit F03). */
export function isNewerThan(saved: Saved | null, version: number): boolean {
  return saved?.version !== undefined && saved.version > version;
}

type Kind = 'array' | 'null' | 'string' | 'number' | 'boolean' | 'object' | 'other';
function kindOf(value: unknown): Kind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'object' ? t : 'other';
}

/**
 * Lays saved fields over the store's defaults, keeping only fields of the same
 * kind as the default. `bookmarks: "oops"` from a bad write would otherwise load
 * and crash every screen that reads it, on every launch (audit F04). Actions are
 * never replaced. A field with no default (optional, or from a newer build) is kept.
 */
export function mergeSaved<S>(saved: unknown, current: S): S {
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return current;
  const out: Record<string, unknown> = { ...(current as Record<string, unknown>) };
  for (const [key, value] of Object.entries(saved)) {
    const now = out[key];
    if (typeof now === 'function') continue;
    if (now === undefined || kindOf(now) === kindOf(value)) out[key] = value;
  }
  return out as S;
}

/** Resolves when `ready` resolves, or after `ms` at the latest: startup never waits forever. */
export function withTimeout(ready: Promise<void>, ms: number): Promise<'ready' | 'timed-out'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timed-out'), ms);
    ready.then(
      () => {
        clearTimeout(timer);
        resolve('ready');
      },
      () => {
        clearTimeout(timer);
        resolve('timed-out');
      },
    );
  });
}
