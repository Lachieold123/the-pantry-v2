import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeRecipe } from '../testing/fixtures';
import { HERO_COUNT, hasHomeFilters, heroKicker, homeFeed, NO_HOME_FILTERS } from './home';

const r = (id: string, over: Parameters<typeof makeRecipe>[2] = {}) => makeRecipe(id, ['1 egg'], over);
const forYou = Array.from({ length: 12 }, (_, i) => r(`p${i}`));

describe('home feed', () => {
  it('leads with the planned dinner, then one cupboard dish, then picks', () => {
    const tonight = r('planned');
    const { heroes, grid } = homeFeed({ tonight, cookableNow: [r('c1'), r('c2')], forYou, filters: NO_HOME_FILTERS, gridCount: 4 });
    assert.deepEqual(
      heroes.map((h) => [h.recipe.id, h.reason]),
      [
        ['planned', 'planned'],
        ['c1', 'cupboard'],
        ['p0', 'pick'],
        ['p1', 'pick'],
        ['p2', 'pick'],
      ],
    );
    assert.equal(heroes.length, HERO_COUNT);
    assert.deepEqual(
      grid.map((x) => x.id),
      ['p3', 'p4', 'p5', 'p6'],
    );
  });
  it('never shows a recipe twice', () => {
    const { heroes, grid } = homeFeed({ tonight: forYou[0], cookableNow: [forYou[1]!], forYou, filters: {}, gridCount: 20 });
    const ids = [...heroes.map((h) => h.recipe.id), ...grid.map((x) => x.id)];
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, forYou.length);
  });
  it('filters the cards and the grid, the planned dinner included', () => {
    const quickLunch = r('lunch', { mealTypes: ['lunch'], prepMinutes: 5, cookMinutes: 5 });
    const { heroes, grid } = homeFeed({
      tonight: r('planned'),
      cookableNow: [],
      forYou: [...forYou, quickLunch],
      filters: { meal: 'lunch' },
      gridCount: 10,
    });
    assert.deepEqual(
      heroes.map((h) => h.recipe.id),
      ['lunch'],
    );
    assert.equal(grid.length, 0);
  });
  it('returns nothing when the filters match nothing', () => {
    const out = homeFeed({ tonight: undefined, cookableNow: [], forYou, filters: { cuisine: 'scandinavian' }, gridCount: 10 });
    assert.equal(out.heroes.length + out.grid.length, 0);
  });
  it('knows when a filter is on', () => {
    assert.equal(hasHomeFilters(NO_HOME_FILTERS), false);
    assert.equal(hasHomeFilters({ time: 'under-30' }), true);
  });
  it('labels each card with why it is there, never "editor’s pick"', () => {
    assert.equal(heroKicker({ recipe: r('a'), reason: 'planned' }, 'Easy'), 'Tonight · On the plan');
    assert.equal(heroKicker({ recipe: r('a'), reason: 'cupboard' }, 'Easy'), 'From your cupboard · Ready now');
    assert.equal(heroKicker({ recipe: r('a'), reason: 'pick' }, 'Medium'), 'Picked for you · Medium');
  });
});
