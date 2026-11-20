// All persisted state goes through here, so the storage engine can change
// (for example to add sync later) without touching the stores. Reads never
// throw: a corrupt blob is backed up and the store starts empty (see
// lib/savedState), so one bad write can't stop the app opening.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

import { backupKey, readSaved, withTimeout } from '@/lib/savedState';

export const STORAGE_PREFIX = 'the-pantry-v2';

/** The longest startup waits for saved data before opening anyway. */
const STARTUP_WAIT_MS = 4000;

/**
 * The storage each store's persist options use: `storage: persistentStorage(version)`, with the
 * store's own version. Saved data from a newer build (a TestFlight rollback) can't be read here,
 * so the store starts empty for this session and the newer data is never saved over (DATA-8).
 */
export function persistentStorage<S>(version: number): PersistStorage<S> {
  return {
    ...storage,
    getItem: async (name) => {
      const saved = await storage.getItem(name);
      if (saved && typeof saved.version === 'number' && saved.version > version) {
        console.warn(`[storage] ${name} was saved by a newer version of the app; won't save over it`);
        unreadable.add(name);
        return null;
      }
      return saved;
    },
  } as PersistStorage<S>;
}

/**
 * Stores whose saved data couldn't be read (storage unavailable, not corrupt).
 * They start empty for this session and are never saved over, so the real
 * data is still there next launch. A corrupt blob is different: it's backed up first.
 */
const unreadable = new Set<string>();

const storage: PersistStorage<unknown> = {
  getItem: async (name) => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(name);
      unreadable.delete(name);
    } catch (e) {
      console.warn(`[storage] couldn't read ${name}; won't save over it this session`, e);
      unreadable.add(name);
      return null;
    }
    const { saved, problem } = readSaved(raw);
    if (problem && raw !== null) {
      console.warn(`[storage] ${name} was ${problem}; kept a copy and started fresh`);
      await AsyncStorage.setItem(backupKey(name, Date.now()), raw).catch(() => undefined);
    }
    return saved as StorageValue<unknown> | null;
  },
  setItem: async (name, value) => {
    if (unreadable.has(name)) return;
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch (e) {
      // Storage full or unavailable: the change stays in memory for this session.
      console.warn(`[storage] couldn't save ${name}`, e);
    }
  },
  removeItem: (name) => AsyncStorage.removeItem(name),
};

type Persisted = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };

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

/** Waits for stores to load, but never longer than the startup limit. */
export function allHydrated(stores: Persisted[]): Promise<'ready' | 'timed-out'> {
  return withTimeout(
    Promise.all(stores.map(hydrated)).then(() => undefined),
    STARTUP_WAIT_MS,
  );
}
