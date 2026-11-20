// The old-app import can be run again after the app stopped part-way through,
// without doubling anything (DATA-17).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCookLog } from './cookLog';
import { useMyRecipes } from './myRecipes';
import { importFromOldAppOnce } from './oldAppImport';
import { useSaved } from './saved';

const OLD = {
  favorites: ['spaghetti-bolognese'],
  collections: [{ id: 'c1', name: 'Weeknights', createdAt: 1, recipeIds: ['thai-green-curry'] }],
  customMeals: [{ id: 'custom-toastie', name: 'Toastie' }],
  cookLog: [
    { id: 'spaghetti-bolognese', at: 1_690_000_000_000 },
    { id: 'custom-toastie', at: 1_691_000_000_000 },
  ],
};
const MARKER = 'the-pantry-v2/old-app-import';
const counts = () => ({
  bookmarks: useSaved.getState().bookmarks.length,
  collections: useSaved.getState().collections.length,
  cooks: useCookLog.getState().log.length,
  recipes: Object.keys(useMyRecipes.getState().recipes).length,
});

it('a re-run after stopping part-way changes nothing', async () => {
  await AsyncStorage.setItem('the-pantry/v1', JSON.stringify(OLD));
  await importFromOldAppOnce();
  const once = counts();
  expect(once).toEqual({ bookmarks: 1, collections: 1, cooks: 2, recipes: 1 });
  expect(JSON.parse((await AsyncStorage.getItem(MARKER)) ?? '{}').done).toBe(true);

  // As if the app stopped after applying but before the marker said done.
  const { at } = JSON.parse((await AsyncStorage.getItem(MARKER)) ?? '{}') as { at: number };
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at, done: false }));
  await importFromOldAppOnce();
  expect(counts()).toEqual(once);

  // As if it stopped before the stores saved at all: the re-run brings everything across.
  useSaved.setState({ bookmarks: [], collections: [] });
  useCookLog.setState({ log: [] });
  useMyRecipes.setState({ recipes: {} });
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at, done: false }));
  await importFromOldAppOnce();
  expect(counts()).toEqual(once);
});

it('an import already marked by an older build is never run again', async () => {
  await AsyncStorage.setItem(MARKER, JSON.stringify({ at: 1, found: true, imported: true }));
  useCookLog.setState({ log: [] });
  await importFromOldAppOnce();
  expect(useCookLog.getState().log).toEqual([]);
});
