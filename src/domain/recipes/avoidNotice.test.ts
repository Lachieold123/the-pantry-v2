import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index, makeRecipe } from '../testing/fixtures';
import { avoidNotice } from './diets';

const nuts = { options: ['nuts' as const], custom: [] };

describe('avoidNotice: the recipe page never implies an unchecked recipe is safe (F-3)', () => {
  it('names the lines it could not check against the avoid list', () => {
    const r = makeRecipe('r', ['1 brown onion', '2 tbsp nutella', '100 g marzipan']);
    assert.deepEqual(avoidNotice(r, nuts, index), {
      avoided: false,
      unchecked: ['nutella', 'marzipan'],
    });
  });
  it('says so when the recipe has something on the avoid list', () => {
    const r = makeRecipe('r', ['200g cashews']);
    assert.equal(avoidNotice(r, nuts, index)?.avoided, true);
  });
  it('says nothing when there is no avoid list', () => {
    const r = makeRecipe('r', ['2 tbsp nutella']);
    assert.equal(avoidNotice(r, { options: [], custom: [] }, index), undefined);
  });
  it('says nothing when every line was checked and none is avoided', () => {
    const r = makeRecipe('r', ['1 brown onion']);
    assert.equal(avoidNotice(r, nuts, index), undefined);
  });
  it('lists a repeated unknown word once', () => {
    const r = makeRecipe('r', ['1 tbsp XO sauce', '1 tsp XO sauce']);
    assert.deepEqual(avoidNotice(r, { options: ['shellfish'], custom: [] }, index)?.unchecked, ['XO sauce']);
  });
});
