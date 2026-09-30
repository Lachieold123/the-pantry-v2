// All persisted state goes through here, so the storage engine can change
// (for example to add sync later) without touching the stores.
//
// The one rule: never overwrite saved data we haven't read. Each key is
// write-locked until its first read settles, and stays locked (read-only) when
// that read failed, when the data came from a newer build, or when a corrupt
// blob couldn't be backed up. The app still opens and works in memory; the
// saved copy waits for a launch that can read it (audit F216, F02, F03, F06).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

import { logger } from '@/lib/logger';
import { backupKey, backupsToPrune, isNewerThan, mergeSaved, readSaved, withTimeout } from '@/lib/savedState';

export const STORAGE_PREFIX = 'the-pantry-v2';

/** The longest startup waits for saved data before opening anyway. */
const STARTUP_WAIT_MS = 4000;

type KeyState = 'reading' | 'writable' | 'read-failed' | 'read-only';

const keys = new Map<string, KeyState>();
const versions = new Map<string, number>();
/** A write made while the key was still being read: kept, and saved only if the read finds nothing to clobber. */
const held = new Map<string, string>();
/** Keys whose last save failed, so a full phone produces one notice, not one per tap. */
const failing = new Set<string>();

export type StorageProblem = { kind: 'save-failed' | 'read-only'; key: string };
const listeners = new Set<(problem: StorageProblem) => void>();

/**
 * Hears about saves that failed and stores that can't be saved this launch, so
 * the UI can say so (audit F05, F220). Read-only stores found before the
 * listener subscribed are replayed, since startup reads finish before any UI exists.
 */
export function onStorageProblem(listener: (problem: StorageProblem) => void): () => void {
  listeners.add(listener);
  for (const [key, state] of keys) if (state === 'read-failed' || state === 'read-only') listener({ kind: 'read-only', key });
  return () => {
    listeners.delete(listener);
  };
}

function report(problem: StorageProblem, why: string, error?: unknown) {
  logger.warn('storage', `${problem.key}: ${why}`, error);
  listeners.forEach((fn) => fn(problem));
}

function lock(name: string, state: 'read-failed' | 'read-only', why: string, error?: unknown) {
  keys.set(name, state);
  held.delete(name);
  report({ kind: 'read-only', key: name }, `${why}; changes won't be saved this launch`, error);
}

async function write(name: string, json: string): Promise<void> {
  try {
    await AsyncStorage.setItem(name, json);
    failing.delete(name);
  } catch (e) {
    // Storage full or unavailable: the change stays in memory for this session.
    if (failing.has(name)) return;
    failing.add(name);
    report({ kind: 'save-failed', key: name }, "couldn't save", e);
  }
}

/** Sets a bad blob aside, keeping only the newest few. Returns false if the copy couldn't be made. */
async function backUp(name: string, raw: string): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove(backupsToPrune(await AsyncStorage.getAllKeys(), name));
  } catch (e) {
    // Pruning is housekeeping; a failure here mustn't stop the backup.
    logger.warn('storage', `couldn't prune old backups of ${name}`, e);
  }
  try {
    await AsyncStorage.setItem(backupKey(name, Date.now()), raw);
    return true;
  } catch (e) {
    logger.warn('storage', `couldn't back up ${name}`, e);
    return false;
  }
}

const storage: PersistStorage<unknown> = {
  getItem: async (name) => {
    keys.set(name, 'reading');
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(name);
    } catch (e) {
      lock(name, 'read-failed', "couldn't be read", e);
      return null;
    }
    const { saved, problem } = readSaved(raw);
    if (problem && raw !== null && !(await backUp(name, raw))) {
      lock(name, 'read-only', `was ${problem} and couldn't be backed up`);
      return null;
    }
    if (problem) logger.warn('storage', `${name} was ${problem}; kept a copy and started fresh`);
    const version = versions.get(name);
    if (version !== undefined && isNewerThan(saved, version)) {
      // Loaded as-is (the field guards drop anything this build can't read) but never written back.
      lock(name, 'read-only', `was saved by a newer version (${saved?.version} > ${version})`);
      return { state: saved?.state, version };
    }
    keys.set(name, 'writable');
    const pending = held.get(name);
    held.delete(name);
    if (pending !== undefined && saved === null) await write(name, pending);
    return saved as StorageValue<unknown> | null;
  },
  setItem: async (name, value) => {
    const json = JSON.stringify(value);
    const state = keys.get(name);
    if (state === undefined || state === 'reading') {
      held.set(name, json);
      return;
    }
    if (state === 'read-only') return;
    if (state === 'read-failed') {
      // Try the read again: if there's now nothing saved, there's nothing to clobber.
      const again = await AsyncStorage.getItem(name).catch((e: unknown) => logger.warn('storage', `${name} still can't be read`, e));
      if (again !== null || keys.get(name) !== 'read-failed') return;
      keys.set(name, 'writable');
    }
    await write(name, json);
  },
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/**
 * A store's key, version and field guard, with the version written once so the
 * storage can spot data from a newer build:
 * `persist(..., { ...savedAs<State>('plan', 1), storage: persistentStorage(), partialize })`.
 */
export function savedAs<S>(key: string, version: number) {
  const name = `${STORAGE_PREFIX}/${key}`;
  versions.set(name, version);
  return { name, version, merge: (saved: unknown, current: S) => mergeSaved(saved, current) };
}

/** The storage each store's persist options use (typed per store, hence a function). */
export function persistentStorage<S>(): PersistStorage<S> {
  return storage as PersistStorage<S>;
}

type Persisted = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
    getOptions: () => { name?: string };
  };
};

/** Resolves once a store has loaded from disk. */
export function hydrated(store: Persisted): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Waits for stores to load, but never longer than the startup limit. Startup calls this once (audit F217). */
export function allHydrated(stores: Persisted[]): Promise<'ready' | 'timed-out'> {
  return withTimeout(
    Promise.all(stores.map(hydrated)).then(() => undefined),
    STARTUP_WAIT_MS,
  );
}

/** True when every store has loaded and can save, so a one-off change to them (the old-app import) will stick. */
export function canSave(stores: Persisted[]): boolean {
  return stores.every((s) => s.persist.hasHydrated() && keys.get(s.persist.getOptions().name ?? '') === 'writable');
}
