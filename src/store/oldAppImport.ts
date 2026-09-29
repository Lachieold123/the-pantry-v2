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
import { persistentStorage, STORAGE_PREFIX } from './storage';

const MARKER = `${STORAGE_PREFIX}/old-app-import`;

/** The one-line "Welcome back" on Today, until it's dismissed. */
export const useWelcomeBack = create<{ message?: string | undefined; dismiss: () => void }>()(
  persist((set) => ({ dismiss: () => set({ message: undefined }) }), {
    name: `${STORAGE_PREFIX}/welcome-back`,
    version: 1,
    storage: persistentStorage,
    partialize: ({ message }) => ({ message }),
  }),
);

type Persisted = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };

function hydrated(store: Persisted): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const off = store.persist.onFinishHydration(() => {
      off();
      resolve();
    });
  });
}

const uniq = <T>(items: T[]) => [...new Set(items)];

export async function importFromOldAppOnce(): Promise<void> {
  // Stores load asynchronously; writing before they finish would be overwritten by the load.
  await Promise.all([useSaved, useCookLog, useCupboard, useMyRecipes, usePreferences, useWelcomeBack].map(hydrated));
  if (await AsyncStorage.getItem(MARKER)) return;

  let raw: string | null = null;
  for (const key of OLD_STORAGE_KEYS) {
    raw = await AsyncStorage.getItem(key);
    if (raw) break;
  }
  const now = Date.now();
  const result = raw
    ? importOldApp(raw, {
        catalogueIds: ALL_CATALOGUE_IDS,
        titleOf: catalogueTitle,
        index: INGREDIENTS,
        now,
        random: () => Math.random().toString(36).slice(2, 6),
      })
    : undefined;
  // Recorded before applying, so an interrupted import can't run twice and duplicate things.
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at: now, found: raw !== null, imported: result !== undefined }));

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
    useCookLog.setState((s) => ({
      log: [...s.log, ...result.cooks.map((c) => ({ id: newId(), ...c }))].sort((a, b) => a.cookedAt - b.cookedAt),
    }));
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
