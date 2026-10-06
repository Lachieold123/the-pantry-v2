import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EMPTY_EDITS } from '../shopping/derive';
import {
  canonicalRows,
  changedRows,
  EMPTY_KITCHEN,
  EMPTY_PERSONAL,
  kitchenFromRows,
  mergeRows,
  personalFromRows,
  rowId,
  rowsToBringAlong,
  scopeOf,
  type Personal,
  type Row,
  type SharedKitchen,
} from './rows';

const asMirror = (rows: Row[]) => Object.fromEntries(rows.map((r) => [rowId(r.kind, r.key), r]));

const personal: Personal = {
  bookmarks: [
    { recipeId: 'pho', savedAt: 20 },
    { recipeId: 'carbonara', savedAt: 10 },
  ],
  collections: [{ id: 'c1', name: 'Weeknights', recipeIds: ['pho'], createdAt: 1, updatedAt: 2 }],
  hidden: ['liver'],
  myRecipes: { m1: { id: 'm1', draft: { title: 'Nan’s scones' } } },
  recent: ['pho', 'carbonara'],
  cookLog: [{ id: 'k1', recipeId: 'pho', cookedAt: 5 }],
  prefs: { diet: 'vegetarian', units: 'metric', weeknight: null },
};

const kitchen: SharedKitchen = {
  entries: [{ id: 'e1', recipeId: 'carbonara', day: '2026-10-06', slot: 'dinner', servings: 4 }],
  listEdits: { '2026-10-05': { ...EMPTY_EDITS, checked: { spaghetti: '400 g' } } },
  cupboard: [{ ingredientId: 'egg', addedAt: 1, source: 'manual' }],
  recipes: {},
};

describe('which scope a row syncs in', () => {
  it('keeps personal things in the account, wherever the kitchen is', () => {
    for (const kind of ['bookmark', 'collection', 'hidden', 'myrecipe', 'recent', 'cooklog', 'prefs'] as const) {
      assert.equal(scopeOf(kind, true), 'account');
      assert.equal(scopeOf(kind, false), 'account');
    }
  });
  it('sends the kitchen to the household when in one, and to the account when not', () => {
    for (const kind of ['plan', 'tick', 'removal', 'extra', 'cupboard'] as const) {
      assert.equal(scopeOf(kind, true), 'household');
      assert.equal(scopeOf(kind, false), 'account');
    }
  });
  it('only copies your recipes for a household: the account already has them', () => {
    assert.equal(scopeOf('recipe', true), 'household');
    assert.equal(scopeOf('recipe', false), undefined);
  });
});

describe('the personal side as rows', () => {
  it('round-trips: rows rebuild exactly what they came from', () => {
    const rows = changedRows({}, personal, 30, 'phone');
    assert.deepEqual(personalFromRows(rows), personal);
  });
  it('a snapshot only makes rows for the parts it holds', () => {
    const kinds = new Set([...canonicalRows({ ...kitchen, ...personal }).values()].map((c) => c.kind));
    assert.ok(kinds.has('plan') && kinds.has('bookmark'));
    const personalOnly = new Set([...canonicalRows(personal).values()].map((c) => c.kind));
    assert.ok(!personalOnly.has('plan') && !personalOnly.has('cupboard'));
    const kitchenOnly = new Set([...canonicalRows(kitchen).values()].map((c) => c.kind));
    assert.ok(!kitchenOnly.has('bookmark') && !kitchenOnly.has('prefs'));
  });
  it('turns an unsave into one deleted row, leaving the other Cookmark alone', () => {
    const after = { ...personal, bookmarks: personal.bookmarks.slice(0, 1) };
    const rows = changedRows(personal, after, 40, 'phone');
    assert.deepEqual(
      rows.map((r) => `${r.kind}:${r.key}:${r.deleted}`),
      ['bookmark:carbonara:true'],
    );
  });
  it('skips rows it can’t read instead of failing', () => {
    const bad: Row[] = [
      { kind: 'collection', key: 'c9', data: { recipeIds: [] }, deleted: false, updatedAt: 1 },
      { kind: 'cooklog', key: 'k9', data: { recipeId: 'pho' }, deleted: false, updatedAt: 1 },
      { kind: 'prefs', key: 'appearance', data: { value: 'dark' }, deleted: false, updatedAt: 1 },
    ];
    assert.deepEqual(personalFromRows(bad), EMPTY_PERSONAL);
  });
  it('two phones saving different recipes don’t clobber each other', () => {
    const a = changedRows({}, { ...EMPTY_PERSONAL, bookmarks: [{ recipeId: 'pho', savedAt: 1 }] }, 10, 'a');
    const b = changedRows({}, { ...EMPTY_PERSONAL, bookmarks: [{ recipeId: 'laksa', savedAt: 2 }] }, 11, 'b');
    const merged = mergeRows(mergeRows({}, a), b);
    assert.deepEqual(
      personalFromRows(Object.values(merged))
        .bookmarks.map((x) => x.recipeId)
        .sort(),
      ['laksa', 'pho'],
    );
  });
});

describe('signing in to an account that already has things in it', () => {
  const account = asMirror(changedRows({}, { ...personal, ...kitchen }, 10, 'other-phone'));

  it('keeps the account’s and adds only what this phone has that it lacks', () => {
    const mine = {
      ...EMPTY_PERSONAL,
      ...EMPTY_KITCHEN,
      bookmarks: [
        { recipeId: 'pho', savedAt: 99 },
        { recipeId: 'laksa', savedAt: 98 },
      ],
      entries: [
        { id: 'e2', recipeId: 'carbonara', day: '2026-10-06', slot: 'dinner' as const, servings: 2 },
        { id: 'e3', recipeId: 'pho', day: '2026-10-07', slot: 'dinner' as const, servings: 2 },
      ],
      prefs: { diet: 'everything', units: 'metric', avoid: { options: [], custom: [] } },
    };
    const rows = rowsToBringAlong(account, mine, 50, 'phone');
    const ids = rows.map((r) => `${r.kind}:${r.key}`).sort();
    // The same meal isn't doubled, the same Cookmark is kept once, and the account's settings win…
    assert.deepEqual(ids, ['bookmark:laksa', 'plan:e3', 'prefs:avoid']);
    // …except one it has never set, which this phone fills in.
  });

  it('folds a collection with the same name into the account’s, instead of making two', () => {
    const mine = {
      ...EMPTY_PERSONAL,
      collections: [{ id: 'c7', name: ' weeknights', recipeIds: ['laksa', 'pho'], createdAt: 3, updatedAt: 3 }],
    };
    const rows = rowsToBringAlong(account, mine, 50, 'phone');
    assert.equal(rows.length, 1);
    const merged = personalFromRows(Object.values(mergeRows(account, rows))).collections;
    assert.deepEqual(
      merged.map((c) => [c.id, c.recipeIds]),
      [['c1', ['pho', 'laksa']]],
    );
  });

  it('brings back something removed elsewhere that this phone still has, so nothing on it is lost', () => {
    const removed = mergeRows(account, [{ kind: 'cupboard', key: 'egg', data: null, deleted: true, updatedAt: 20, updatedBy: 'x' }]);
    const rows = rowsToBringAlong(removed, { ...EMPTY_KITCHEN, cupboard: kitchen.cupboard }, 50, 'phone');
    assert.deepEqual(
      rows.map((r) => r.key),
      ['egg'],
    );
    assert.equal(kitchenFromRows(Object.values(mergeRows(removed, rows))).cupboard.length, 1);
  });
});
