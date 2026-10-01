import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index, kitchen, makeRecipe } from '../testing/fixtures';
import { cookable, DEFAULT_SHELF } from './cookable';
import { allOnList, cupboardTally, recipeWords } from './summary';

const dish = makeRecipe('dish', [
  '1 white onion',
  '2 garlic cloves',
  '1 courgette',
  '1 tsp ground cumin',
  '100g feta',
  '1 garlic clove, extra',
  '1 lemon (optional)',
]);

describe('the recipe page cupboard card', () => {
  const result = cookable(dish, new Set(['brown-onion', 'garlic', 'lemon']), DEFAULT_SHELF, index, kitchen);
  const tally = cupboardTally(dish, result);

  it('pills what you have and what a stand-in covers', () => {
    assert.deepEqual([...tally.haveIds].sort(), ['garlic', 'white-onion']);
  });
  it('counts lines, as the pills are drawn: garlic twice is two', () => {
    assert.equal(tally.have, 3);
  });
  it('leaves shelf items out of both numbers', () => {
    assert.ok(result.shelf.includes('ground-cumin'));
    assert.equal(tally.total, 5);
  });
  it("doesn't pill an optional ingredient, because it isn't counted", () => {
    assert.ok(!tally.haveIds.has('lemon'));
  });
  it("uses the recipe's own word, not the database name", () => {
    assert.equal(recipeWords(dish).get('zucchini'), 'courgette');
  });
  it('knows when everything missing is already on the list', () => {
    assert.equal(allOnList(['feta', 'zucchini'], [{ ingredientId: 'feta' }, { ingredientId: 'zucchini' }]), true);
    assert.equal(allOnList(['feta', 'zucchini'], [{ ingredientId: 'feta' }, {}]), false);
    assert.equal(allOnList([], []), false);
  });
});
