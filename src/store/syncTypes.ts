// The sync engine's shapes (./sync): what a scope keeps, and what it plugs in.
import type { Cursor } from '@/domain/sync/cursor';
import type { Row, Snapshot } from '@/domain/sync/rows';

export type SyncStatus = 'idle' | 'syncing' | 'offline';

export type ScopeState = {
  mirror: Record<string, Row>;
  /** Rows waiting to be sent, newest per record. */
  pending: Record<string, Row>;
  status: SyncStatus;
  lastSyncedAt: number | undefined;
  /** Rows the server refused, kept on this phone (they're still in the mirror) but never sent again. */
  setAside?: Record<string, Row> | undefined;
  /** Where the next pull starts (K-36): the newest server stamp pulled, and the household or account it's from. */
  cursor?: Cursor | undefined;
};

/** A pull's answer: the rows, and the newest server stamp among them (none from an older server). */
export type Pulled = { rows: Row[]; newest: number | undefined };

/** `rejected`: the server answered and refused the rows (not a network problem), so sending again won't help. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; rejected?: boolean | undefined };

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
  /** The household or account being synced, so a pull mark is never used for another. */
  id: () => string;
  /** Rows the server received after a stamp, or every row when it's undefined. */
  pull: (after: number | undefined) => Promise<Outcome<Pulled>>;
  push: (rows: Row[]) => Promise<Outcome<null>>;
  listen: (onRow: (row: Row) => void) => () => void;
  /**
   * Runs before the sync starts (the saved sign-in loading); false holds the
   * start until the app next comes to the front. Changes made meanwhile are
   * still recorded (BUG-04).
   */
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
