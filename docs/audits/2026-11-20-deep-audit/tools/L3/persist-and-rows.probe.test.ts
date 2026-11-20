// Lane 3 probes (20 Nov audit). Run: npx tsx --test docs/audits/2026-11-20-deep-audit/tools/L3/persist-and-rows.probe.test.ts
// Each test asserts the CURRENT (faulty or confirmed) behaviour, so a pass = the finding reproduces.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStore } from 'zustand/vanilla';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';

import { rowFits, isPastKeeping } from '../../../../../src/domain/sync/limits';
import { changedRows, kitchenFromRows, personalFromRows, rowsToBringAlong, type Row } from '../../../../../src/domain/sync/rows';
import { pullAfter, advance } from '../../../../../src/domain/sync/cursor';

/** In-memory twin of src/store/storage.ts (same JSON + readSaved-level checks), without AsyncStorage. */
function memory(initial: Record<string, string>) {
  const disk = { ...initial };
  const storage: PersistStorage<unknown> = {
    getItem: async (n) => (disk[n] ? (JSON.parse(disk[n]) as StorageValue<unknown>) : null),
    setItem: async (n, v) => {
      disk[n] = JSON.stringify(v);
    },
    removeItem: async (n) => {
      delete disk[n];
    },
  };
  return { disk, storage };
}
const tick = () => new Promise((r) => setTimeout(r, 10));

describe('DATA-persist: zustand 5 persist as the stores use it', () => {
  it('a blob from a NEWER build (version 2) on a version-1 store without migrate loads as empty, then the next change overwrites it', async () => {
    const newer = JSON.stringify({ state: { bookmarks: [{ recipeId: 'carbonara', savedAt: 1 }] }, version: 2 });
    const { disk, storage } = memory({ saved: newer });
    const store = createStore<{ bookmarks: { recipeId: string }[] }>()(
      persist(() => ({ bookmarks: [] }), { name: 'saved', version: 1, storage }),
    );
    await tick();
    assert.equal(store.persist.hasHydrated(), true);
    assert.deepEqual(store.getState().bookmarks, []); // the cook sees no Cookmarks
    store.setState({ bookmarks: [{ recipeId: 'pasta' }] });
    await tick();
    assert.equal(JSON.parse(disk.saved!).version, 1); // the newer build's data is gone from disk
    assert.ok(!disk.saved!.includes('carbonara'));
  });

  it('a throw inside onRehydrateStorage (plan.ts prunes there) leaves hasHydrated false and never fires onFinishHydration', async () => {
    const bad = JSON.stringify({ state: { entries: null, listEdits: {} }, version: 1 });
    const { storage } = memory({ plan: bad });
    let finished = false;
    const store = createStore<{ entries: unknown[]; listEdits: Record<string, unknown> }>()(
      persist(() => ({ entries: [], listEdits: {} }), {
        name: 'plan',
        version: 1,
        storage,
        // Same shape as src/store/plan.ts: reads state.entries without a guard.
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          (state.entries as unknown[]).filter(() => true);
        },
      }),
    );
    store.persist.onFinishHydration(() => {
      finished = true;
    });
    await tick();
    assert.equal(store.persist.hasHydrated(), false);
    assert.equal(finished, false); // useAppReady's Promise.all(STORES.map(hydrated)) never resolves: no sync, no account start
  });
});

describe('DATA-rows: what the server will and will not take', () => {
  const recipe = (methodText: string) => ({
    id: 'my-big-1',
    draft: { title: 'Big', ingredientsText: 'x', methodText, mealTypes: ['dinner'] },
  });
  it('a recipe of your own with about 60 KB of method text is set aside (never backed up, nothing on screen)', () => {
    const row: Row = { kind: 'myrecipe', key: 'my-big-1', data: recipe('a'.repeat(61_000)), deleted: false, updatedAt: 1 };
    assert.equal(rowFits(row), false);
  });

  it('a collection whose own row is set aside vanishes on the other phone even though its member rows arrived', () => {
    const ids = Array.from({ length: 2600 }, (_, i) => `house-recipe-number-${i}`);
    const rows = changedRows({ bookmarks: [] }, {
      bookmarks: [],
      collections: [{ id: 'c1', name: 'Everything', recipeIds: ids, createdAt: 1, updatedAt: 1 }],
    }, 10, 'dev');
    const head = rows.find((r) => r.key === 'c1')!;
    assert.equal(rowFits(head), false);
    const sent = rows.filter(rowFits);
    assert.equal(sent.length, 2600);
    assert.equal(personalFromRows(sent).collections.length, 0);
  });

  it('delete_account (live and pending versions) removes the leaver\'s recipe rows but keeps the plan rows that point at them', () => {
    const rows: Row[] = [
      { kind: 'plan', key: 'e1', data: { recipeId: 'my-nan-soup', day: '2026-11-23', slot: 'dinner', servings: 2 }, deleted: false, updatedAt: 5 },
      { kind: 'recipe', key: 'my-nan-soup', data: null, deleted: true, updatedAt: 6 },
    ];
    const k = kitchenFromRows(rows);
    assert.equal(k.entries.length, 1);
    assert.equal(Object.keys(k.recipes).length, 0); // a planned dinner with no recipe behind it on every other phone
  });
});

describe('DATA-merge: joining and signing in do not prune', () => {
  it('rowsToBringAlong / adoptHousehold keep weeks the plan has pruned; only receive() filters them', () => {
    const old: Row = { kind: 'plan', key: 'old', data: { recipeId: 'r', day: '2025-01-06', slot: 'dinner', servings: 2 }, deleted: false, updatedAt: 1 };
    assert.equal(isPastKeeping(old, '2026-09-28'), true);
    assert.equal(kitchenFromRows([old]).entries.length, 1); // applyMirror after adoptHousehold shows it
    assert.deepEqual(rowsToBringAlong({ 'plan:old': old }, { entries: [], listEdits: {}, cupboard: [], recipes: {} }, 2), []);
  });
});

describe('DATA-cursor sanity (refutation checks)', () => {
  it('a mark from another household is ignored and never moves back', () => {
    assert.equal(pullAfter({ scope: 'h1', at: 1_000_000 }, 'h2'), undefined);
    assert.deepEqual(advance({ scope: 'h1', at: 900 }, 'h1', 100), { scope: 'h1', at: 900 });
  });
});
