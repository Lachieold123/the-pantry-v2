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
