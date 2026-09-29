import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { addToCupboard, cupboardIds, recipeCoverage, whatCanIMake } from './match';

describe('cupboard', () => {
  const cup = new Set(['brown-onion', 'garlic', 'chickpeas']);
  const dish = makeRecipe('dish', [
    '1 brown onion',
    '2 garlic cloves',
    '400g tinned chickpeas',
    '1 tsp salt',
    '100g feta',
    '1 lemon (optional)',
  ]);
  it('ignores staples and optional lines when measuring coverage', () => {
    const c = recipeCoverage(dish, cup, index);
    assert.equal(c.needed, 4);
    assert.equal(c.have, 3);
    assert.equal(c.missing.length, 1);
  });
  it('an empty cupboard gives an empty result, not a random list', () => {
    assert.deepEqual(whatCanIMake(catalogue, new Set(), index), []);
  });
  it('ranks recipes by how much you already have', () => {
    const ranked = whatCanIMake(catalogue, cup, index, 10);
    assert.ok(ranked.length > 0);
    for (let i = 1; i < ranked.length; i++) assert.ok((ranked[i - 1]?.coverage.ratio ?? 0) >= (ranked[i]?.coverage.ratio ?? 0));
  });
  it('adding is idempotent and keeps the original entry', () => {
    const one = addToCupboard([], ['garlic'], 'manual', 1);
    const two = addToCupboard(one, ['garlic', 'garlic', 'lemon'], 'shop', 2);
    assert.deepEqual([...cupboardIds(two)], ['garlic', 'lemon']);
    assert.equal(two[0]?.source, 'manual');
    assert.equal(addToCupboard(two, ['lemon'], 'shop', 3), two);
  });
});
