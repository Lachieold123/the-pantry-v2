// Short words are never fuzzed: "pie" is one letter from "pig", and a cook
// searching for pie doesn't want pork (audit F210).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeRecipe } from '../testing/fixtures';
import { indexForSearch, searchRecipes } from './search';

describe('three-letter searches', () => {
  const pig = makeRecipe('pig-roast', ['1 kg pork shoulder'], { title: 'Pig on a spit' });
  const pie = makeRecipe('apple-pie', ['4 apples'], { title: 'Apple pie' });
  it('"pie" doesn’t find a pig when there is no pie', () => {
    assert.deepEqual(
      searchRecipes(
        indexForSearch([pig], (c) => c),
        'pie',
      ),
      [],
    );
  });
  it('"pie" finds the pie', () => {
    assert.deepEqual(
      searchRecipes(
        indexForSearch([pig, pie], (c) => c),
        'pie',
      ).map((r) => r.id),
      ['apple-pie'],
    );
  });
  it('a four-letter word still forgives a typo', () => {
    const pork = makeRecipe('pork-chops', ['2 pork chops'], { title: 'Pork chops' });
    assert.deepEqual(
      searchRecipes(
        indexForSearch([pork], (c) => c),
        'prok',
      ).map((r) => r.id),
      ['pork-chops'],
    );
  });
});
