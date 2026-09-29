import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NO_FILTERS } from '../recipes/search';
import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { pickSurprise, type SurpriseInput } from './surprise';

describe('Surprise me', () => {
  const base: SurpriseInput = {
    recipes: catalogue,
    filters: NO_FILTERS,
    diet: 'everything',
    avoid: { options: [], custom: [] },
    hidden: new Set(),
    planned: new Set(),
    recentlyCooked: [],
    alreadyShown: [],
    index,
    random: () => 0.5,
  };
  it('never breaks the diet or avoid list, over every possible pick', () => {
    const input = { ...base, diet: 'vegetarian' as const, avoid: { options: ['nuts' as const, 'dairy' as const], custom: [] } };
    for (let i = 0; i < 200; i++) {
      const pick = pickSurprise({ ...input, random: () => i / 200 });
      assert.ok(pick);
      assert.ok(pick.diets.includes('vegetarian'), pick.id);
      assert.ok(pick.diets.includes('no-dairy'), pick.id);
    }
  });
  it('skips hidden, planned and recently cooked dishes while it can', () => {
    const two = [makeRecipe('a', ['1 egg']), makeRecipe('b', ['1 egg'])];
    assert.equal(pickSurprise({ ...base, recipes: two, planned: new Set(['a']), random: () => 0 })?.id, 'b');
    assert.equal(pickSurprise({ ...base, recipes: two, hidden: new Set(['a']), random: () => 0 })?.id, 'b');
    // Soft rules give way when they'd leave nothing.
    assert.equal(pickSurprise({ ...base, recipes: two, planned: new Set(['a']), recentlyCooked: ['b'], random: () => 0 })?.id, 'b');
  });
  it('returns nothing only when the hard rules leave nothing', () => {
    assert.equal(pickSurprise({ ...base, filters: { ...NO_FILTERS, cuisines: ['scandinavian'], time: 'under-30' } }), undefined);
  });
});
