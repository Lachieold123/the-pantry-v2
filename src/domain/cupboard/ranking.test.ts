// "What can I cook" puts the recipe that uses most of your cupboard first:
// that's the promise of the screen (audit F210).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index, kitchen, makeRecipe } from '../testing/fixtures';
import { DEFAULT_SHELF, whatCanICook } from './cookable';

describe('what can I cook: order', () => {
  it('ranks a ready recipe that uses more of your cupboard above one that uses less', () => {
    const more = makeRecipe('more', ['1 garlic clove', '1 brown onion', '400g tinned chickpeas']);
    const less = makeRecipe('less', ['1 garlic clove']);
    const have = new Set(['garlic', 'brown-onion', 'chickpeas']);
    for (const seed of ['2026-09-29', '2026-09-30', '2026-10-01']) {
      const { ready } = whatCanICook({ recipes: [less, more], have, shelf: DEFAULT_SHELF, index, kitchen, saved: new Set(), seed });
      assert.deepEqual(
        ready.map((m) => m.recipe.id),
        ['more', 'less'],
        seed,
      );
    }
  });
});
