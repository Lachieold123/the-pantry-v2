// Every saved store is waited for at startup and accounted for when signing
// out or deleting (REPO-11, DATA-11), and odd saved data can't switch sync off
// or be saved over (DATA-8, DATA-9).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { useHomeEvents } from './homeEvents';
import { PERSISTED_STORES } from './persisted';
import { usePlan } from './plan';
import { CLEARED_ON_DELETE, CLEARED_ON_SIGN_OUT, KEPT, wipeAfterDeletion } from './reset';
import { hydrated } from './storage';

const nameOf = (s: (typeof PERSISTED_STORES)[number]) => s.persist.getOptions().name ?? '';

/** Every `${STORAGE_PREFIX}/…` name a store file in this folder saves under. */
function namesInSource(): string[] {
  const dir = __dirname;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
    .flatMap((f) =>
      [...readFileSync(join(dir, f), 'utf8').matchAll(/name: `\$\{STORAGE_PREFIX\}\/([a-z-]+)`/g)].map((m) => `the-pantry-v2/${m[1]}`),
    )
    .sort();
}

it('startup waits for every saved store', () => {
  expect(PERSISTED_STORES.map(nameOf).sort()).toEqual(namesInSource());
});

it('signing out and deleting say what happens to every saved store (the account is cleared by its own actions)', () => {
  const covered = [...CLEARED_ON_SIGN_OUT, ...CLEARED_ON_DELETE, ...KEPT].map(nameOf);
  expect([...covered, 'the-pantry-v2/account'].sort()).toEqual(namesInSource());
});

it('deleting the account clears the Home log, follows included', async () => {
  useHomeEvents.getState().log('follow', { cookId: 'cook-1' });
  expect(useHomeEvents.getState().events.length).toBeGreaterThan(0);
  await wipeAfterDeletion();
  expect(useHomeEvents.getState().events).toEqual([]);
});

describe('loading saved data', () => {
  it('a plan saved with odd fields still finishes loading, so sync can start (DATA-9)', async () => {
    await AsyncStorage.setItem('the-pantry-v2/plan', JSON.stringify({ state: { entries: null, listEdits: null }, version: 1 }));
    await usePlan.persist.rehydrate();
    await hydrated(usePlan);
    expect(usePlan.persist.hasHydrated()).toBe(true);
    expect(usePlan.getState().entries).toEqual([]);
  });

  it('data saved by a newer build is never saved over (DATA-8)', async () => {
    const newer = JSON.stringify({ state: { entries: [], listEdits: {}, extra: 'from v2' }, version: 2 });
    await AsyncStorage.setItem('the-pantry-v2/plan', newer);
    await usePlan.persist.rehydrate();
    usePlan.getState().addEntry('pho', '2099-01-05', 'dinner', 2);
    await new Promise((r) => setTimeout(r, 10));
    expect(await AsyncStorage.getItem('the-pantry-v2/plan')).toBe(newer);
  });
});
