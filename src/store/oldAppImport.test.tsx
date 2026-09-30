// The import end to end, against the real stores: it runs, and running it
// again (a new importer version, or a run that stopped half way) adds nothing twice.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCookLog } from './cookLog';
import { useMyRecipes } from './myRecipes';
import { IMPORT_MARKER, importFromOldAppOnce, useWelcomeBack, wipeableStorageKeys } from './oldAppImport';
import { usePreferences } from './preferences';
import { useSaved } from './saved';

const OLD = {
  favorites: ['spaghetti-bolognese', 'custom-nans-soup'],
  collections: [
    { id: 'c1', name: 'Weeknights', createdAt: 1, recipeIds: ['thai-green-curry'] },
    { id: 'c2', name: 'weeknights', createdAt: 2, recipeIds: ['spaghetti-bolognese'] },
  ],
  hidden: [],
  recents: ['thai-green-curry'],
  customMeals: [{ id: 'custom-nans-soup', name: 'Nan’s soup' }],
  customRecipes: {},
  cookedRecipes: ['spaghetti-bolognese', 'custom-nans-soup'],
  pantryItems: ['Rice'],
  preferences: { completed: true, diet: 'omnivore', cuisines: [], time: 'medium', skill: 'medium', avoid: [], unitSystem: 'metric' },
};

const snapshot = () => ({
  bookmarks: useSaved.getState().bookmarks.map((b) => b.recipeId),
  collections: useSaved.getState().collections.map((c) => [c.name, c.recipeIds]),
  cooks: useCookLog.getState().log.map((e) => [e.recipeId, e.dateUnknown]),
  recipes: Object.keys(useMyRecipes.getState().recipes),
});

beforeAll(async () => {
  await AsyncStorage.setItem('the-pantry/v1', JSON.stringify(OLD));
});

test('imports the old app’s real fields once, and a re-run adds nothing twice', async () => {
  await importFromOldAppOnce();
  const first = snapshot();
  expect(first.bookmarks[0]).toMatch(/^my-nan-s-soup-/);
  expect(first.bookmarks[1]).toBe('spaghetti-bolognese');
  // "Weeknights" and "weeknights" become one collection.
  expect(first.collections).toEqual([['Weeknights', ['thai-green-curry', 'spaghetti-bolognese']]]);
  expect(first.cooks).toEqual([
    ['spaghetti-bolognese', true],
    [first.bookmarks[0], true],
  ]);
  expect(first.recipes).toHaveLength(1);
  // A skipped v1 onboarding isn't an answer: v2's welcome still shows.
  expect(usePreferences.getState().onboarded).toBe(false);
  expect(useWelcomeBack.getState().message).toContain('2 cooked dishes');
  expect(JSON.parse((await AsyncStorage.getItem(IMPORT_MARKER)) ?? '{}')).toMatchObject({ version: 2, imported: true });

  // Same version: nothing runs.
  await importFromOldAppOnce();
  expect(snapshot()).toEqual(first);

  // An older importer's marker: it runs again, and only fills gaps.
  useWelcomeBack.getState().dismiss();
  await AsyncStorage.setItem(IMPORT_MARKER, JSON.stringify({ at: 1, found: true, imported: true }));
  await importFromOldAppOnce();
  expect(snapshot()).toEqual(first);
  expect(useWelcomeBack.getState().message).toBeUndefined();
});

test('a wipe of v2’s data keeps the import marker', () => {
  expect(wipeableStorageKeys([IMPORT_MARKER, 'the-pantry-v2/saved', 'the-pantry/v1'])).toEqual(['the-pantry-v2/saved']);
});
