import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CUPBOARD_CATEGORIES } from '../cupboard/kitchen';
import { eligibleForSurprise } from '../suggestions/surprise';
import { NO_FILTERS } from '../recipes/search';
import { catalogue, index, kitchen } from '../testing/fixtures';
import { pickedLabel, WELCOME_PICKS, welcomeCupboardPicks } from './cupboardPicks';

const none = new Set<string>();

describe('the welcome cupboard grid', () => {
  it('offers a full grid of everyday things, with no staples or shelf items', () => {
    const picks = welcomeCupboardPicks(catalogue, none, index, kitchen);
    assert.equal(picks.length, WELCOME_PICKS);
    assert.equal(new Set(picks).size, picks.length);
    for (const id of picks) {
      assert.ok(!index.byId.get(id)?.staple, id);
      assert.ok(!kitchen.isShelf(id), id);
    }
    // The everyday basics a first-time cook is most likely to have.
    for (const id of ['garlic', 'egg', 'chicken-thigh']) assert.ok(picks.includes(id), id);
  });

  it('groups by cupboard jar, in the Cupboard tab’s order', () => {
    const jars = welcomeCupboardPicks(catalogue, none, index, kitchen).map((id) => CUPBOARD_CATEGORIES.indexOf(kitchen.category(id)));
    assert.deepEqual(
      jars,
      [...jars].sort((a, b) => a - b),
    );
  });

  it('follows the diet: a vegetarian is never offered meat', () => {
    const eats = eligibleForSurprise({
      recipes: catalogue,
      filters: NO_FILTERS,
      diet: 'vegetarian',
      avoid: { options: [], custom: [] },
      hidden: new Set(),
      index,
    });
    const picks = welcomeCupboardPicks(eats, none, index, kitchen);
    assert.ok(picks.length > 0);
    for (const id of ['chicken-thigh', 'beef-mince', 'prawn']) assert.ok(!picks.includes(id), id);
  });

  it('leaves out what is already in the cupboard, so a redo only offers new things', () => {
    const picks = welcomeCupboardPicks(catalogue, new Set(['garlic', 'egg']), index, kitchen);
    assert.ok(!picks.includes('garlic'));
    assert.ok(!picks.includes('egg'));
  });

  it('is empty when nothing is left to suggest', () => {
    assert.deepEqual(welcomeCupboardPicks([], none, index, kitchen), []);
  });

  it('counts in plain words', () => {
    assert.equal(pickedLabel(0), 'Tap what you have');
    assert.equal(pickedLabel(1), '1 thing');
    assert.equal(pickedLabel(8), '8 things');
  });
});
