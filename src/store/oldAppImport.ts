// On first launch, brings a tester's data across from the old app (D-005).
// Same bundle id, so the old app's saved data sits in the same storage.
// Runs once per importer version (a marker records it), never deletes the old
// data, and only adds what's missing, so a re-run after a fix or an interrupted
// run can't duplicate anything (audit F07).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ALL_CATALOGUE_IDS, catalogueDish, INGREDIENTS } from '@/data/catalogue/catalogue';
import { addToCupboard } from '@/domain/cupboard/match';
import { IMPORT_VERSION, mergeBookmarks, mergeCooks, shouldImport, wipeableKeys } from '@/domain/legacy/merge';
import { importOldApp, OLD_STORAGE_KEYS, type OldAppImport } from '@/domain/legacy/oldApp';
import { welcomeBackLine } from '@/domain/legacy/welcome';
import { addCollection } from '@/domain/saved/collections';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useMyRecipes } from './myRecipes';
import { usePreferences } from './preferences';
import { useSaved } from './saved';
import { canSave, persistentStorage, savedAs, STORAGE_PREFIX } from './storage';

/**
 * Records that the import ran, and with which version. It lives under v2's
 * prefix, so a wipe of v2's data must keep it or the old data comes straight
 * back: wipe with `wipeableStorageKeys` (audit F214).
 */
export const IMPORT_MARKER = `${STORAGE_PREFIX}/old-app-import`;

/** The v2 keys a wipe may remove: all of v2's, except the import marker. */
export function wipeableStorageKeys(allKeys: readonly string[]): string[] {
  return wipeableKeys(allKeys, STORAGE_PREFIX, IMPORT_MARKER);
}

/** The one-line "Welcome back" on Today, until it's dismissed. */
type WelcomeBackState = { message?: string | undefined; dismiss: () => void };
export const useWelcomeBack = create<WelcomeBackState>()(
  persist((set) => ({ dismiss: () => set({ message: undefined }) }), {
    ...savedAs<WelcomeBackState>('welcome-back', 1),
    storage: persistentStorage(),
    partialize: ({ message }) => ({ message }),
  }),
);

const uniq = <T>(items: T[]) => [...new Set(items)];

export async function importFromOldAppOnce(): Promise<void> {
  // Startup has already waited for the stores (once, audit F217). If any didn't load, or can't
  // save this launch, skip the import rather than write the marker and lose what it brought in.
  if (!canSave([useSaved, useCookLog, useCupboard, useMyRecipes, usePreferences, useWelcomeBack])) return;
  const { run, importedBefore } = shouldImport(await AsyncStorage.getItem(IMPORT_MARKER));
  if (!run) return;

  let raw: string | null = null;
  for (const key of OLD_STORAGE_KEYS) {
    raw = await AsyncStorage.getItem(key);
    if (raw) break;
  }
  const now = Date.now();
  // Only after an earlier run: that importer gave recipes random ids, so reuse the ones it made rather than copy them again.
  const mine = new Map(importedBefore ? Object.values(useMyRecipes.getState().recipes).map((r) => [r.draft.title, r.id]) : []);
  const result = raw
    ? importOldApp(raw, { catalogueIds: ALL_CATALOGUE_IDS, dish: catalogueDish, index: INGREDIENTS, now, mine: (title) => mine.get(title) })
    : undefined;
  if (result) apply(result, now, !importedBefore);
  // Written after applying: if applying stops half way, the next launch runs it again, and that's safe.
  await AsyncStorage.setItem(
    IMPORT_MARKER,
    JSON.stringify({ version: IMPORT_VERSION, at: now, found: raw !== null, imported: result !== undefined }),
  );
}

function apply(result: OldAppImport, now: number, firstTime: boolean): void {
  useSaved.setState((s) => ({
    bookmarks: mergeBookmarks(s.bookmarks, result.bookmarks, now),
    collections: result.collections.reduce((list, c) => addCollection(list, { ...c, updatedAt: now }), s.collections),
    hidden: uniq([...s.hidden, ...result.hidden]),
    recentlyViewed: uniq([...s.recentlyViewed, ...result.recentlyViewed]).slice(0, 20),
  }));
  useCookLog.setState((s) => ({ log: mergeCooks(s.log, result.cooks) }));
  useCupboard.setState((s) => ({ items: addToCupboard(s.items, result.cupboard, 'manual', now) }));
  const { recipes, save } = useMyRecipes.getState();
  // Never overwrite one that's already here: it may have been edited since the last run.
  for (const r of result.recipes) if (!recipes[r.id]) save({ id: r.id, draft: r.draft, source: 'user' });
  // Old answers only fill in a v2 that hasn't been set up yet; they never overwrite v2 choices.
  if (result.taste && !usePreferences.getState().onboarded) {
    usePreferences.getState().applyTaste(result.taste);
    usePreferences.getState().setOnboarded(true);
  }
  // A re-run adds quietly: the tester already had their welcome.
  const line = firstTime ? welcomeBackLine(result) : undefined;
  if (line) useWelcomeBack.setState({ message: line });
}
