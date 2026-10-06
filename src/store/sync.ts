// One sync engine per scope (D-039, D-043): the household's shared kitchen,
// and your account. Each keeps a mirror of its scope's rows beside the stores,
// which stay the app's truth on this phone.
//
// - A change on this phone becomes a few rows (domain/sync), saved to the
//   mirror and to `pending` at once, and sent a moment later (debounced).
// - Rows from another phone arrive live, merge into the mirror "newest
//   wins", and the stores are rebuilt from it.
// - Offline, everything still works; it pulls and sends again on reconnect
//   and whenever the app comes to the front.
//
// Where the mirror and pending rows are kept (and persisted) is up to each
// scope's store: the engine reads and writes them through its adapter.
import { AppState } from 'react-native';

import { changedRows, mergeRows, rowId, type Row, type Snapshot } from '@/domain/sync/rows';

export type SyncStatus = 'idle' | 'syncing' | 'offline';

export type ScopeState = {
  mirror: Record<string, Row>;
  /** Rows waiting to be sent, newest per record. */
  pending: Record<string, Row>;
  status: SyncStatus;
  lastSyncedAt: number | undefined;
};

type Outcome<T> = { ok: true; value: T } | { ok: false };

export type ScopeAdapter = {
  read: () => ScopeState;
  write: (patch: Partial<ScopeState>) => void;
  /** Whether this scope should be syncing now (in a household; signed in). */
  active: () => boolean;
  /** What this scope holds on this phone right now. */
  local: () => Snapshot;
  /**
   * Names the set of kinds the scope holds. When it changes (the account
   * gains or loses the kitchen as you leave or join a household), the next
   * comparison starts afresh instead of reading the move as deletions, and
   * `reshape` says what, if anything, to send for the move.
   */
  shape?: () => string;
  reshape?: (from: string, to: string) => Row[];
  /** Rebuilds the stores from the mirror's rows. */
  apply: (rows: Row[]) => void;
  /** Subscribes to every store `local` reads; returns the stops. */
  watch: (onChange: () => void) => (() => void)[];
  author: () => string | undefined;
  pull: () => Promise<Outcome<Row[]>>;
  push: (rows: Row[]) => Promise<Outcome<null>>;
  listen: (onRow: (row: Row) => void) => () => void;
  /** Runs before the sync starts (the saved sign-in loading); false stops the start. */
  ready?: () => Promise<boolean>;
  /** After each start and each return to the app (the household's member list). */
  refresh?: () => void;
};

export type Engine = {
  /** Starts syncing if the scope is active. Safe to call more than once. */
  start: () => void;
  stop: () => void;
  running: () => boolean;
  /** Rows made on this phone outside the usual change watch (starting a household, merging). */
  record: (rows: readonly Row[]) => void;
  /** Rebuilds the stores from the mirror. */
  applyMirror: () => void;
  /** Forgets the last snapshot, so the next change is compared with the stores as they are then. */
  rebase: () => void;
  /** Merges rows from elsewhere and rebuilds the stores if anything changed. */
  receive: (rows: readonly Row[]) => void;
  pull: () => Promise<boolean>;
  flush: () => Promise<void>;
  waiting: () => number;
};

const FLUSH_DELAY_MS = 400;
const RETRY_DELAY_MS = 30_000;

export function createEngine(scope: ScopeAdapter): Engine {
  let applying = false;
  let last: Snapshot | undefined;
  let lastShape = '';
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let flushing = false;
  let stops: (() => void)[] = [];
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
    const rows = changedRows(last, next, Date.now(), scope.author());
    last = next;
    record(rows);
  }

  function receive(rows: readonly Row[]): void {
    const before = scope.read().mirror;
    const mirror = mergeRows(before, rows);
    if (mirror === before) return;
    scope.write({ mirror });
    applyMirror();
  }

  function scheduleFlush(delay = FLUSH_DELAY_MS): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void flush(), delay);
  }

  async function flush(): Promise<void> {
    const rows = Object.values(scope.read().pending);
    if (!scope.active() || flushing || !rows.length) return;
    flushing = true;
    scope.write({ status: 'syncing' });
    const asked = generation;
    const sent = await scope.push(rows);
    flushing = false;
    if (asked !== generation) return;
    if (!sent.ok) {
      scope.write({ status: 'offline' });
      scheduleFlush(RETRY_DELAY_MS);
      return;
    }
    // Keep anything that changed again while this batch was in flight.
    const left = { ...scope.read().pending };
    for (const r of rows) {
      const id = rowId(r.kind, r.key);
      if (left[id] === r) delete left[id];
    }
    scope.write({ pending: left, status: 'idle', lastSyncedAt: Date.now() });
    if (Object.keys(left).length) scheduleFlush();
  }

  async function pull(): Promise<boolean> {
    if (!scope.active()) return false;
    const asked = generation;
    const rows = await scope.pull();
    if (asked !== generation || !scope.active()) return false;
    if (!rows.ok) {
      scope.write({ status: 'offline' });
      return false;
    }
    receive(rows.value);
    scope.write({ lastSyncedAt: Date.now(), ...(Object.keys(scope.read().pending).length ? {} : { status: 'idle' }) });
    return true;
  }

  function start(): void {
    if (!scope.active() || stops.length || starting) return;
    starting = true;
    void (scope.ready?.() ?? Promise.resolve(true)).then((ok) => {
      starting = false;
      if (!ok || !scope.active() || stops.length) return;
      remember();
      const appState = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        void pull().then(flush);
        scope.refresh?.();
      });
      stops = [...scope.watch(onLocalChange), scope.listen((row) => receive([row])), () => appState.remove()];
      // Anything left unsent from last time goes out after the pull.
      void pull().then(flush);
      scope.refresh?.();
    });
  }

  function stop(): void {
    generation += 1;
    for (const s of stops) s();
    stops = [];
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
