// One sync engine per scope (D-039, D-043): the household's shared kitchen,
// and your account. Each keeps a mirror of its scope's rows beside the stores,
// which stay the app's truth on this phone.
//
// - A change on this phone becomes a few rows (domain/sync), saved to the
//   mirror and to `pending` at once, and sent a moment later (debounced).
// - Rows from another phone arrive live, merge into the mirror "newest
//   wins", and the stores are rebuilt from it.
// - Offline, everything still works; it pulls and sends again on reconnect
//   and whenever the app comes to the front. A pull asks only for what the
//   server received since the last one (K-36, domain/sync/cursor).
//
// - A row the server refuses (too long, malformed) is set aside, so it never
//   holds up the rest (BUG-03). Network trouble keeps everything waiting.
//
// Where the mirror and pending rows are kept (and persisted) is up to each
// scope's store: the engine reads and writes them through its adapter.
import { AppState } from 'react-native';

import { pruneCutoff, toISODate } from '@/domain/plan/week';
import { advance, pullAfter } from '@/domain/sync/cursor';
import { isPastKeeping, rowFits, stampAfter } from '@/domain/sync/limits';
import { changedRows, mergeRows, rowId, type Row, type Snapshot } from '@/domain/sync/rows';
import type { Engine, ScopeAdapter } from './syncTypes';

export type { Engine, ScopeAdapter, ScopeState, SyncStatus } from './syncTypes';

const FLUSH_DELAY_MS = 400;
const RETRY_DELAY_MS = 30_000;

export function createEngine(scope: ScopeAdapter): Engine {
  let applying = false;
  let last: Snapshot | undefined;
  let lastShape = '';
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let flushing: Promise<void> | undefined;
  let stops: (() => void)[] = [];
  /** Watching the stores and the app coming to the front: from the first start, before the sync is ready. */
  let watching: (() => void)[] = [];
  let starting = false;
  /** Bumped by each stop, so an answer that arrives after a stop (left the household, signed out) is dropped. */
  let generation = 0;

  const shapeNow = () => scope.shape?.() ?? '';
  const remember = () => {
    last = scope.local();
    lastShape = shapeNow();
  };

  function applyMirror(): void {
    applying = true;
    try {
      scope.apply(Object.values(scope.read().mirror));
    } finally {
      applying = false;
    }
    remember();
  }

  function record(rows: readonly Row[]): void {
    if (!rows.length) return;
    const s = scope.read();
    const pending = { ...s.pending };
    for (const r of rows) pending[rowId(r.kind, r.key)] = r;
    scope.write({ mirror: mergeRows(s.mirror, rows), pending });
    scheduleFlush();
  }

  /** A change made on this phone. */
  function onLocalChange(): void {
    if (applying || !scope.active()) return;
    const shape = shapeNow();
    const next = scope.local();
    if (last === undefined) {
      remember();
      return;
    }
    if (shape !== lastShape) {
      const from = lastShape;
      last = next;
      lastShape = shape;
      record(scope.reshape?.(from, shape) ?? []);
      return;
    }
    const rows = stampAfter(changedRows(last, next, Date.now(), scope.author()), scope.read().mirror);
    last = next;
    record(rows);
  }

  function receive(rows: readonly Row[]): void {
    const before = scope.read().mirror;
    const merged = mergeRows(before, rows);
    if (merged === before) return;
    // Weeks the plan has let go of stay out of the mirror, so it can't grow without end.
    const cutoff = pruneCutoff(toISODate(new Date()));
    const mirror = Object.fromEntries(Object.entries(merged).filter(([, r]) => !isPastKeeping(r, cutoff)));
    scope.write({ mirror });
    applyMirror();
  }

  function scheduleFlush(delay = FLUSH_DELAY_MS): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void flush(), delay);
  }

  /** Sends what's waiting. While a send is running, answers with that send, so a caller can wait for it. */
  function flush(): Promise<void> {
    flushing ??= send().finally(() => {
      flushing = undefined;
    });
    return flushing;
  }

  /** Takes rows out of the queue for good, keeping them on this phone. */
  function setAside(rows: readonly Row[]): void {
    if (!rows.length) return;
    const s = scope.read();
    const pending = { ...s.pending };
    const aside = { ...s.setAside };
    for (const r of rows) {
      const id = rowId(r.kind, r.key);
      if (pending[id] === r) delete pending[id];
      aside[id] = r;
    }
    console.warn(`[sync] set aside ${rows.length} row(s) the server won't take`);
    scope.write({ pending, setAside: aside });
  }

  /** Sends each row on its own, after the server refused a batch, so only the bad ones are set aside. */
  async function sendOneByOne(rows: readonly Row[], asked: number): Promise<{ ok: Row[]; offline: boolean }> {
    const ok: Row[] = [];
    const refused: Row[] = [];
    for (const r of rows) {
      const one = await scope.push([r]);
      if (asked !== generation) return { ok, offline: false };
      if (one.ok) ok.push(r);
      else if (one.rejected) refused.push(r);
      else return { ok, offline: true };
    }
    setAside(refused);
    return { ok, offline: false };
  }

  async function send(): Promise<void> {
    if (!scope.active()) return;
    const waiting = Object.values(scope.read().pending);
    setAside(waiting.filter((r) => !rowFits(r)));
    const rows = waiting.filter(rowFits);
    if (!rows.length) return;
    scope.write({ status: 'syncing' });
    const asked = generation;
    const sent = await scope.push(rows);
    if (asked !== generation) return;
    let done: readonly Row[] = rows;
    if (!sent.ok) {
      const retry = sent.rejected ? await sendOneByOne(rows, asked) : { ok: [], offline: true };
      if (asked !== generation) return;
      if (retry.offline) {
        markSent(retry.ok);
        scope.write({ status: 'offline' });
        scheduleFlush(RETRY_DELAY_MS);
        return;
      }
      done = retry.ok;
    }
    markSent(done);
    scope.write({ status: 'idle', lastSyncedAt: Date.now() });
    if (Object.keys(scope.read().pending).length) scheduleFlush();
  }

  /** Clears sent rows from the queue, keeping anything that changed again while they were in flight. */
  function markSent(rows: readonly Row[]): void {
    if (!rows.length) return;
    const left = { ...scope.read().pending };
    for (const r of rows) {
      const id = rowId(r.kind, r.key);
      if (left[id] === r) delete left[id];
    }
    scope.write({ pending: left });
  }

  /** Pulls what the server received since the last pull (K-36); everything the first time, or for a new scope. */
  async function pull(): Promise<boolean> {
    if (!scope.active()) return false;
    const asked = generation;
    const id = scope.id();
    const pulled = await scope.pull(pullAfter(scope.read().cursor, id));
    if (asked !== generation || !scope.active() || scope.id() !== id) return false;
    if (!pulled.ok) {
      scope.write({ status: 'offline' });
      return false;
    }
    receive(pulled.value.rows);
    scope.write({
      cursor: advance(scope.read().cursor, id, pulled.value.newest),
      lastSyncedAt: Date.now(),
      ...(Object.keys(scope.read().pending).length ? {} : { status: 'idle' }),
    });
    return true;
  }

  function start(): void {
    if (!scope.active() || stops.length || starting) return;
    starting = true;
    // Watch first: a change made while the sign-in loads (offline, a slow refresh) is still a change.
    if (!watching.length) {
      remember();
      const appState = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        if (!stops.length) return start(); // The last start was held (no sign-in yet): try again.
        void pull().then(flush);
        scope.refresh?.();
      });
      watching = [...scope.watch(onLocalChange), () => appState.remove()];
    }
    const asked = generation;
    void (scope.ready?.() ?? Promise.resolve(true))
      .catch(() => false)
      .then((ok) => {
        starting = false;
        if (asked !== generation || !ok || !scope.active() || stops.length) return;
        stops = [scope.listen((row) => receive([row]))];
        // Anything left unsent from last time goes out after the pull.
        void pull().then(flush);
        scope.refresh?.();
      });
  }

  function stop(): void {
    generation += 1;
    for (const s of [...stops, ...watching]) s();
    stops = [];
    watching = [];
    starting = false;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = undefined;
    last = undefined;
  }

  return {
    start,
    stop,
    running: () => stops.length > 0,
    record,
    applyMirror,
    rebase: () => {
      last = undefined;
    },
    receive,
    pull,
    flush,
    waiting: () => Object.keys(scope.read().pending).length,
  };
}
