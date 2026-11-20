// On first launch, brings a tester's data across from the old app (D-005).
// Same bundle id, so the old app's saved data sits in the same storage.
// Runs once (a marker records it), never deletes the old data, and merges
// into anything already here rather than replacing it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ALL_CATALOGUE_IDS, catalogueTitle, INGREDIENTS } from '@/data/catalogue/catalogue';
import { addToCupboard } from '@/domain/cupboard/match';
import { importOldApp, OLD_STORAGE_KEYS, welcomeBackLine } from '@/domain/legacy/oldApp';
import { newId } from '@/lib/ids';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useMyRecipes } from './myRecipes';
import { usePreferences } from './preferences';
import { useSaved } from './saved';
import { allHydrated, persistentStorage, STORAGE_PREFIX } from './storage';

const MARKER = `${STORAGE_PREFIX}/old-app-import`;

/** The one-line "Welcome back" on Today, until it's dismissed. */
export const useWelcomeBack = create<{ message?: string | undefined; dismiss: () => void }>()(
  persist((set) => ({ dismiss: () => set({ message: undefined }) }), {
    name: `${STORAGE_PREFIX}/welcome-back`,
    version: 1,
    storage: persistentStorage(1),
    partialize: ({ message }) => ({ message }),
  }),
);

const uniq = <T>(items: T[]) => [...new Set(items)];

export async function importFromOldAppOnce(): Promise<void> {
  // Stores load asynchronously; writing before they finish would be overwritten by the load.
  // If they never finish loading, skip the import this launch rather than risk overwriting anything.
  if ((await allHydrated([useSaved, useCookLog, useCupboard, useMyRecipes, usePreferences, useWelcomeBack])) === 'timed-out') return;
  // An older marker has no `done`: those imports finished. `done: false` means the app stopped part-way (DATA-17): run again.
  const marker = parseMarker(await AsyncStorage.getItem(MARKER));
  if (marker && marker.done !== false) return;

  let raw: string | null = null;
  for (const key of OLD_STORAGE_KEYS) {
    raw = await AsyncStorage.getItem(key);
    if (raw) break;
  }
  // The same time and the same "random" ids on a re-run, so running twice changes nothing.
  const now = marker?.at ?? Date.now();
  let n = 0;
  const result = raw
    ? importOldApp(raw, {
        catalogueIds: ALL_CATALOGUE_IDS,
        titleOf: catalogueTitle,
        index: INGREDIENTS,
        now,
        random: () => (now + n++).toString(36).slice(-4),
      })
    : undefined;
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at: now, done: false }));
  apply(result, now);
  // AsyncStorage writes in order, and each store's save was issued as it changed, so "done" lands after them.
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at: now, found: raw !== null, imported: result !== undefined, done: true }));
}

function parseMarker(raw: string | null): { at?: number; done?: boolean } | undefined {
  if (!raw) return undefined;
  try {
    const m = JSON.parse(raw) as unknown;
    return typeof m === 'object' && m !== null ? (m as { at?: number; done?: boolean }) : {};
  } catch {
    return {}; // unreadable: treat as finished rather than risk doubling things
  }
}

function apply(result: ReturnType<typeof importOldApp> | undefined, now: number): void {
  if (result) {
    useSaved.setState((s) => {
      const have = new Set(s.bookmarks.map((b) => b.recipeId));
      // Older favourites get older dates, so Saved keeps the old app's order.
      const bookmarks = result.bookmarks.filter((id) => !have.has(id)).map((recipeId, i) => ({ recipeId, savedAt: now - i }));
      const names = new Set(s.collections.map((c) => c.name.toLowerCase()));
      const collections = result.collections
        .filter((c) => !names.has(c.name.toLowerCase()))
        .map((c) => ({ id: newId(), name: c.name, recipeIds: c.recipeIds, createdAt: c.createdAt, updatedAt: now }));
      return {
        bookmarks: [...s.bookmarks, ...bookmarks],
        collections: [...s.collections, ...collections],
        hidden: uniq([...s.hidden, ...result.hidden]),
        recentlyViewed: uniq([...s.recentlyViewed, ...result.recentlyViewed]).slice(0, 20),
      };
    });
    useCookLog.setState((s) => {
      const have = new Set(s.log.map((c) => c.id));
      const cooks = result.cooks.map((c, i) => ({ id: `old-${now}-${i}`, ...c })).filter((c) => !have.has(c.id));
      return { log: [...s.log, ...cooks].sort((a, b) => a.cookedAt - b.cookedAt) };
    });
    useCupboard.setState((s) => ({ items: addToCupboard(s.items, result.cupboard, 'manual', now) }));
    const saveRecipe = useMyRecipes.getState().save;
    for (const r of result.recipes) saveRecipe({ id: r.id, draft: r.draft, source: 'user' });
    if (result.taste) {
      usePreferences.getState().applyTaste(result.taste);
      usePreferences.getState().setOnboarded(true);
    }
    const line = welcomeBackLine(result);
    if (line) useWelcomeBack.setState({ message: line });
  }
}
