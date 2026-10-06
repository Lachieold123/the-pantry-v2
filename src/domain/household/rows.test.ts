import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EMPTY_EDITS } from '../shopping/derive';
import {
  canonicalRows,
  changedRows,
  EMPTY_KITCHEN,
  kitchenFromRows,
  mergeRows,
  plannedOwnRecipes,
  rowId,
  rowsToBringAlong,
  type Row,
  type SharedKitchen,
} from './rows';

const week = '2026-10-05';
const kitchen: SharedKitchen = {
  entries: [{ id: 'e1', recipeId: 'carbonara', day: '2026-10-06', slot: 'dinner', servings: 4 }],
  listEdits: {
    [week]: {
      ...EMPTY_EDITS,
      checked: { spaghetti: '400 g' },
      removed: { 'text:salt': 'e1' },
      extras: [{ id: 'x1', text: 'Dishwashing liquid', addedAt: 5 }],
      checkedExtras: ['x1'],
    },
  },
  cupboard: [{ ingredientId: 'egg', addedAt: 1, source: 'manual' }],
  recipes: {},
};
const asMirror = (rows: Row[]) => Object.fromEntries(rows.map((r) => [rowId(r.kind, r.key), r]));

describe('a kitchen as rows', () => {
  it('round-trips: rows rebuild exactly the kitchen they came from', () => {
    const rows = changedRows(EMPTY_KITCHEN, kitchen, 10, 'me');
    assert.equal(rows.length, 5);
    assert.deepEqual(kitchenFromRows(rows), kitchen);
  });
  it('turns a change into just the rows that changed, and a removal into a deleted row', () => {
    const after: SharedKitchen = {
      ...kitchen,
      entries: [],
      cupboard: [...kitchen.cupboard, { ingredientId: 'milk', addedAt: 2, source: 'shop' }],
    };
    const rows = changedRows(kitchen, after, 20, 'me');
    assert.deepEqual(rows.map((r) => `${r.kind}:${r.key}:${r.deleted}`).sort(), ['cupboard:milk:false', 'plan:e1:true']);
  });
  it('skips rows it can’t read instead of failing', () => {
    const bad: Row[] = [
      { kind: 'plan', key: 'e9', data: { recipeId: 'x', day: '2026-10-06', slot: 'supper', servings: 2 }, deleted: false, updatedAt: 1 },
      { kind: 'tick', key: 'no-week', data: { amount: '1' }, deleted: false, updatedAt: 1 },
      { kind: 'cupboard', key: 'egg', data: null, deleted: false, updatedAt: 1 },
    ];
    assert.deepEqual(kitchenFromRows(bad), EMPTY_KITCHEN);
  });
});

describe('merging rows from another phone', () => {
  const base = asMirror(changedRows(EMPTY_KITCHEN, kitchen, 10, 'a'));
  it('takes a newer row and ignores an older one', () => {
    const untick: Row = { kind: 'tick', key: `${week}|spaghetti`, data: null, deleted: true, updatedAt: 11, updatedBy: 'b' };
    const merged = mergeRows(base, [untick]);
    assert.equal(kitchenFromRows(Object.values(merged)).listEdits[week]?.checked.spaghetti, undefined);
    const stale: Row = { ...untick, updatedAt: 9 };
    assert.equal(mergeRows(base, [stale]), base);
  });
  it('breaks a tie the same way on every phone', () => {
    const a: Row = { kind: 'cupboard', key: 'egg', data: null, deleted: true, updatedAt: 10, updatedBy: 'b' };
    const b: Row = { kind: 'cupboard', key: 'egg', data: { addedAt: 1, source: 'manual' }, deleted: false, updatedAt: 10, updatedBy: 'a' };
    const one = mergeRows(mergeRows({}, [a]), [b]);
    const two = mergeRows(mergeRows({}, [b]), [a]);
    assert.deepEqual(one, two);
  });
});

describe('joining a household', () => {
  it('keeps the household’s rows and brings along only what it lacks, without doubling a shared meal', () => {
    const theirs = asMirror(changedRows(EMPTY_KITCHEN, { ...EMPTY_KITCHEN, entries: kitchen.entries }, 10, 'b'));
    const mine: SharedKitchen = {
      ...kitchen,
      entries: [
        { id: 'e2', recipeId: 'carbonara', day: '2026-10-06', slot: 'dinner', servings: 2 },
        { id: 'e3', recipeId: 'pho', day: '2026-10-07', slot: 'dinner', servings: 2 },
      ],
    };
    const rows = rowsToBringAlong(theirs, mine, 20, 'a');
    const plans = rows.filter((r) => r.kind === 'plan').map((r) => r.key);
    assert.deepEqual(plans, ['e3']);
    assert.ok(rows.some((r) => r.kind === 'cupboard' && r.key === 'egg'));
  });
});

describe('your own recipes', () => {
  it('only travel when the shared plan uses them', () => {
    const own = { mine1: { id: 'mine1' }, mine2: { id: 'mine2' } };
    const entries = [{ id: 'e1', recipeId: 'mine2', day: '2026-10-06', slot: 'dinner' as const, servings: 2 }];
    assert.deepEqual(Object.keys(plannedOwnRecipes(entries, own)), ['mine2']);
    assert.equal(canonicalRows({ ...EMPTY_KITCHEN, recipes: plannedOwnRecipes(entries, own) }).size, 1);
  });
});
