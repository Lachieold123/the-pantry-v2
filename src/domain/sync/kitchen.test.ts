// The kitchen and personal rows directly (the 8 October audit found no direct
// tests): malformed rows are skipped (SEC-05), and collections merge (BUG-29).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EMPTY_DRAFT } from '../recipes/draft';
import { asStoredRecipe, storedRecipes } from '../recipes/stored';
import { changedRows, EMPTY_PERSONAL, kitchenFromRows, mergeRows, personalFromRows, type Row } from './rows';

const row = (kind: Row['kind'], key: string, data: unknown): Row => ({ kind, key, data, deleted: false, updatedAt: 1 });

describe('rows from other phones that don’t make sense are skipped (SEC-05)', () => {
  it('keeps only what an extra has, with the right types', () => {
    const k = kitchenFromRows([
      row('extra', 'x1', { week: '2026-10-05', text: 'Milk', quantity: 'lots', unit: 'bucket', evil: { a: 1 }, recipeId: 7 }),
      row('extra', 'x2', { week: 'next tuesday', text: 'Bread' }),
    ]);
    const extras = k.listEdits['2026-10-05']?.extras ?? [];
    assert.deepEqual(extras, [{ id: 'x1', text: 'Milk', addedAt: 1 }]);
    assert.equal(Object.keys(k.listEdits).length, 1);
  });
  it('reads an unknown cupboard source as added by hand, and skips a plan with silly servings', () => {
    const k = kitchenFromRows([
      row('cupboard', 'egg', { addedAt: 1, source: 'hacked' }),
      row('plan', 'p1', { recipeId: 'pho', day: '2026-10-05', slot: 'dinner', servings: 1e9 }),
    ]);
    assert.equal(k.cupboard[0]?.source, 'manual');
    assert.equal(k.entries.length, 0);
  });
  it('skips a shared recipe with a broken draft, instead of crashing every phone', () => {
    const good = { id: 'r1', draft: { ...EMPTY_DRAFT, title: 'Soup' }, source: 'user', createdAt: 1, updatedAt: 1 };
    const out = storedRecipes({
      r1: good,
      x: { id: 'x', draft: {} },
      y: 'nope',
      z: { ...good, id: 'z', draft: { ...good.draft, mealTypes: ['brunch'] } },
    });
    assert.deepEqual(Object.keys(out), ['r1']);
  });
  it('drops a null cuisine (JSON has no undefined) rather than rejecting the recipe', () => {
    const r = asStoredRecipe({
      id: 'r1',
      draft: { ...EMPTY_DRAFT, cuisine: null },
      source: 'imported',
      sourceUrl: null,
      createdAt: 1,
      updatedAt: 2,
    });
    assert.ok(r);
    assert.equal('cuisine' in (r?.draft ?? {}), false);
  });
  it('refuses absurd sizes', () => {
    assert.equal(asStoredRecipe({ id: 'r1', draft: { ...EMPTY_DRAFT, methodText: 'x'.repeat(40_000) }, source: 'user' }), undefined);
  });
});

describe('collections on two phones (BUG-29)', () => {
  const base = { ...EMPTY_PERSONAL, collections: [{ id: 'c1', name: 'Weeknights', recipeIds: ['r0'], createdAt: 1, updatedAt: 1 }] };
  const withRecipes = (ids: string[], at: number) => ({
    ...base,
    collections: [{ ...base.collections[0]!, recipeIds: ids, updatedAt: at }],
  });
  const start = mergeRows({}, changedRows(EMPTY_PERSONAL, base, 1, 'x'));

  it('keeps both phones’ offline adds', () => {
    const a = changedRows(base, withRecipes(['r0', 'rA'], 2), 10, 'a');
    const b = changedRows(base, withRecipes(['r0', 'rB'], 3), 20, 'b');
    const m = mergeRows(mergeRows(start, a), b);
    assert.deepEqual(personalFromRows(Object.values(m)).collections[0]?.recipeIds, ['r0', 'rB', 'rA']);
  });
  it('keeps a removal on one phone while the other adds', () => {
    const a = changedRows(base, withRecipes([], 2), 10, 'a');
    const b = changedRows(base, withRecipes(['r0', 'rB'], 3), 20, 'b');
    const m = mergeRows(mergeRows(start, a), b);
    assert.deepEqual(personalFromRows(Object.values(m)).collections[0]?.recipeIds, ['rB']);
  });
  it('still reads a collection written before member rows existed', () => {
    const old = [row('collection', 'c9', { name: 'Old', recipeIds: ['a', 'b'], createdAt: 1, updatedAt: 1 })];
    assert.deepEqual(personalFromRows(old).collections[0]?.recipeIds, ['a', 'b']);
  });
});
