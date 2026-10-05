import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index, makeRecipe } from '../testing/fixtures';
import { deriveShoppingList, EMPTY_EDITS } from './derive';
import { addExtras } from './extras';
import { recipeKeysOnList, recipeListRows, startPicked } from './fromRecipe';

const stew = makeRecipe('stew', [
  '1 brown onion, diced',
  '500g beef mince',
  '1 brown onion, sliced',
  '2 tbsp olive oil',
  '1 tbsp lime juice',
  '1 tsp ground cumin',
  '2 tbsp blorp sauce',
  'Fresh parsley, to serve (optional)',
]);

const rows = (opts: { servings?: number; cupboard?: string[]; onList?: string[] } = {}) =>
  recipeListRows({
    recipe: stew,
    servings: opts.servings ?? 4,
    index,
    has: (id) => (opts.cupboard ?? []).includes(id),
    onList: new Set(opts.onList ?? []),
    units: 'metric',
  });
const row = (r: ReturnType<typeof rows>, key: string) => r.find((x) => x.key === key);

describe('a recipe’s lines for the shopping list', () => {
  it('merges lines for the same ingredient into one row with the total', () => {
    assert.equal(rows().filter((r) => r.key === 'brown-onion').length, 1);
    assert.equal(row(rows(), 'brown-onion')?.amount, '2');
  });
  it('scales amounts to the servings chosen', () => {
    assert.equal(row(rows({ servings: 8 }), 'beef-mince')?.amount, '1 kg');
    assert.equal(row(rows({ servings: 8 }), 'beef-mince')?.addition.quantity, 1000);
  });
  it('lists limes to buy, not tablespoons of juice', () => {
    assert.equal(row(rows(), 'lime')?.amount, '1');
  });
  it('says what you have, what’s a staple and what’s already on the list', () => {
    const r = rows({ cupboard: ['ground-cumin'], onList: ['beef-mince'] });
    assert.equal(row(r, 'ground-cumin')?.status, 'have');
    assert.equal(row(r, 'olive-oil')?.status, 'staple');
    assert.equal(row(r, 'beef-mince')?.status, 'on-list');
    assert.equal(row(r, 'brown-onion')?.status, 'need');
  });
  it('ticks only what you need to begin with, and leaves optional lines for you to choose', () => {
    const r = rows({ cupboard: ['ground-cumin'] });
    const picked = startPicked(r);
    assert.ok(picked.has('brown-onion'));
    assert.ok(!picked.has('ground-cumin'));
    assert.ok(!picked.has('olive-oil'));
    assert.ok(![...picked].some((k) => k.includes('parsley')));
  });
  it('carries the recipe and amount on known ingredients, and writes the amount into plain-text ones', () => {
    assert.deepEqual(row(rows(), 'beef-mince')?.addition, {
      text: 'Beef mince',
      ingredientId: 'beef-mince',
      recipeId: 'stew',
      quantity: 500,
      unit: 'g',
    });
    const blorp = rows().find((r) => r.key.startsWith('text:') && r.name.includes('blorp'));
    assert.equal(blorp?.addition.text, 'Blorp sauce, 2 tbsp');
    assert.equal(blorp?.addition.ingredientId, undefined);
  });
});

describe('what of a recipe is already on the list', () => {
  it('finds lines from a planned recipe and from earlier adds, plain text included', () => {
    const picked = rows().filter((r) => r.key === 'beef-mince' || r.key.startsWith('text:blorp'));
    const edits = addExtras(
      EMPTY_EDITS,
      picked.map((r) => r.addition),
      () => `x${Math.random()}`,
      1,
    ).edits;
    const list = deriveShoppingList({
      entries: [],
      getRecipe: () => undefined,
      index,
      cupboard: new Set(),
      edits,
      units: 'metric',
    });
    const keys = recipeKeysOnList(list, edits.extras, 'stew');
    assert.ok(keys.has('beef-mince'));
    assert.ok(keys.has(picked.find((r) => r.key.startsWith('text:'))?.key ?? '?'));
    assert.equal(recipeKeysOnList(list, edits.extras, 'other').size, 0);
  });
});
