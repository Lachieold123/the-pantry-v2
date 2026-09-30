// The storage layer's one promise: saved data we couldn't read is never
// overwritten. Each test uses its own key, since the layer tracks keys for the
// whole session, just as the app does.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { usePlan } from './plan';
import { canSave, hydrated, onStorageProblem, persistentStorage, savedAs, STORAGE_PREFIX, type StorageProblem } from './storage';

type TestState = { items: string[]; add: (item: string) => void };

let n = 0;
function makeStore(version = 1) {
  n += 1;
  const key = `test-${n}`;
  const store = create<TestState>()(
    persist((set) => ({ items: [], add: (item) => set((s) => ({ items: [...s.items, item] })) }), {
      ...savedAs<TestState>(key, version),
      storage: persistentStorage(),
      partialize: ({ items }) => ({ items }),
    }),
  );
  return { store, name: `${STORAGE_PREFIX}/${key}` };
}
/** The name the next makeStore() will use, so a test can seed disk first. */
const nextName = () => `${STORAGE_PREFIX}/test-${n + 1}`;
const onDisk = async (name: string) => JSON.parse((await AsyncStorage.getItem(name)) ?? 'null');
const settle = () => new Promise((r) => setTimeout(r, 0));
const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

let problems: StorageProblem[] = [];
let unsubscribe: () => void = () => {};
beforeEach(async () => {
  await AsyncStorage.clear();
  problems = [];
  unsubscribe = onStorageProblem((p) => problems.push(p));
});
afterEach(() => unsubscribe());
/** Problems for one key: subscribing replays keys earlier tests locked, as it would in the app. */
const problemsFor = (name: string) => problems.filter((p) => p.key === name).map((p) => p.kind);

describe('saved data', () => {
  it('backs up a corrupt blob, starts fresh, and saves again', async () => {
    const name = nextName();
    await AsyncStorage.setItem(`${name}.corrupt.1`, 'old');
    await AsyncStorage.setItem(`${name}.corrupt.2`, 'old');
    await AsyncStorage.setItem(`${name}.corrupt.3`, 'old');
    await AsyncStorage.setItem(name, '{"state":{"items":');
    const { store } = makeStore();
    await hydrated(store);
    expect(store.getState().items).toEqual([]);
    const backups = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`${name}.corrupt.`));
    expect(backups).toHaveLength(3);
    expect(backups).not.toContain(`${name}.corrupt.1`);
    store.getState().add('a');
    await settle();
    expect((await onDisk(name)).state.items).toEqual(['a']);
  });

  it('never overwrites data it failed to read', async () => {
    const name = nextName();
    await AsyncStorage.setItem(name, JSON.stringify({ state: { items: ['saved'] }, version: 1 }));
    getItem.mockImplementationOnce(() => Promise.reject(new Error('disk busy')));
    const { store } = makeStore();
    await hydrated(store);
    expect(canSave([store])).toBe(false);
    expect(problemsFor(name)).toEqual(['read-only']);
    store.getState().add('new');
    await settle();
    expect((await onDisk(name)).state.items).toEqual(['saved']);
  });

  it('saves again once a retried read shows there was nothing to lose', async () => {
    getItem.mockImplementationOnce(() => Promise.reject(new Error('disk busy')));
    const { store, name } = makeStore();
    await hydrated(store);
    store.getState().add('new');
    await settle();
    expect((await onDisk(name)).state.items).toEqual(['new']);
  });

  it('reports a failed save once, and again only after a save succeeds', async () => {
    const { store, name } = makeStore();
    await hydrated(store);
    setItem.mockImplementationOnce(() => Promise.reject(new Error('full')));
    setItem.mockImplementationOnce(() => Promise.reject(new Error('full')));
    store.getState().add('a');
    await settle();
    store.getState().add('b');
    await settle();
    expect(problemsFor(name)).toEqual(['save-failed']);
    store.getState().add('c');
    await settle();
    expect((await onDisk(name)).state.items).toEqual(['a', 'b', 'c']);
  });

  it('loads data from a newer build but never writes over it', async () => {
    const name = nextName();
    const newer = { state: { items: ['from v2'], extra: true }, version: 2 };
    await AsyncStorage.setItem(name, JSON.stringify(newer));
    const { store } = makeStore(1);
    await hydrated(store);
    expect(store.getState().items).toEqual(['from v2']);
    store.getState().add('x');
    await settle();
    expect(await onDisk(name)).toEqual(newer);
    expect(problemsFor(name)).toEqual(['read-only']);
  });

  it('drops wrong-shaped fields instead of crashing', async () => {
    const name = nextName();
    await AsyncStorage.setItem(name, JSON.stringify({ state: { items: 'oops' }, version: 1 }));
    const { store } = makeStore();
    await hydrated(store);
    expect(store.getState().items).toEqual([]);
  });

  it('holds a write made before the read, and drops it if there was saved data', async () => {
    const name = nextName();
    await AsyncStorage.setItem(name, JSON.stringify({ state: { items: ['saved'] }, version: 1 }));
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    getItem.mockImplementationOnce(async () => {
      await gate;
      return JSON.stringify({ state: { items: ['saved'] }, version: 1 });
    });
    const { store } = makeStore();
    store.getState().add('early');
    await settle();
    expect((await onDisk(name)).state.items).toEqual(['saved']);
    release();
    await hydrated(store);
    expect(store.getState().items).toEqual(['saved']);
    expect((await onDisk(name)).state.items).toEqual(['saved']);
  });

  it('saves a write made before the read when nothing was saved', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    getItem.mockImplementationOnce(async () => {
      await gate;
      return null;
    });
    const { store, name } = makeStore();
    store.getState().add('early');
    release();
    await hydrated(store);
    expect((await onDisk(name)).state.items).toEqual(['early']);
  });
});

describe('the saved plan', () => {
  const name = `${STORAGE_PREFIX}/plan`;
  const entry = { id: 'a', recipeId: 'r', day: '2026-01-10', slot: 'dinner', servings: 2 };

  it('survives wrong-shaped entries and list edits', async () => {
    const upcoming = { ...entry, day: '2099-01-05' };
    await AsyncStorage.setItem(name, JSON.stringify({ state: { entries: [upcoming, null, 'x'], listEdits: null }, version: 1 }));
    await usePlan.persist.rehydrate();
    expect(usePlan.getState().entries.map((e) => e.id)).toEqual(['a']);
    expect(usePlan.getState().listEdits).toEqual({});
  });

  it('prunes from its high-water mark, not straight from the clock (audit F08)', async () => {
    await AsyncStorage.setItem(name, JSON.stringify({ state: { entries: [entry], listEdits: {}, prunedTo: '2026-01-01' }, version: 1 }));
    await usePlan.persist.rehydrate();
    expect(usePlan.getState().entries).toHaveLength(1);
    expect(usePlan.getState().prunedTo).toBe('2026-01-15');
    await settle();
    expect((await onDisk(name)).state.prunedTo).toBe('2026-01-15');
  });
});
