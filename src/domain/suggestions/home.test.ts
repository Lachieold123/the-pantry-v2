import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeRecipe } from '../testing/fixtures';
import { defaultHomeMode, HERO_COUNT, hasHomeFilters, heroKicker, homeFeed, NO_HOME_FILTERS, type HomeFilters } from './home';

const r = (id: string, over: Parameters<typeof makeRecipe>[2] = {}) => makeRecipe(id, ['1 egg'], over);
const forYou = Array.from({ length: 12 }, (_, i) => r(`p${i}`));
const base = { tonight: undefined, ready: [], nearly: [], forYou, filters: NO_HOME_FILTERS, gridCount: 4 };
const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);

describe('home feed: what I have', () => {
  const ready = [r('r1'), r('r2'), r('r3')];
  const nearly = [r('n1'), r('n2')];

  it('shows only dishes the cupboard can make, then the nearly shelf', () => {
    const feed = homeFeed({ ...base, mode: 'pantry', ready, nearly });
    assert.deepEqual(
      feed.heroes.map((h) => [h.recipe.id, h.reason]),
      [
        ['r1', 'ready'],
        ['r2', 'ready'],
        ['r3', 'ready'],
      ],
    );
    assert.deepEqual(feed.grid, []);
    assert.deepEqual(ids(feed.nearly), ['n1', 'n2']);
    assert.equal(feed.readyCount, 3);
  });
  it('leads with tonight’s dinner only when the cupboard can make it', () => {
    assert.equal(homeFeed({ ...base, mode: 'pantry', ready, nearly, tonight: ready[1] }).heroes[0]?.reason, 'planned');
    const notReady = homeFeed({ ...base, mode: 'pantry', ready, nearly, tonight: r('shop-first') });
    assert.ok(!ids(notReady.heroes.map((h) => h.recipe)).includes('shop-first'));
  });
  it('puts the closest dishes on the cards when nothing is ready, labelled as needing things', () => {
    const feed = homeFeed({ ...base, mode: 'pantry', ready: [], nearly });
    assert.deepEqual(
      feed.heroes.map((h) => h.reason),
      ['nearly', 'nearly'],
    );
    assert.deepEqual(feed.nearly, []);
    assert.equal(feed.readyCount, 0);
  });
  it('fills the grid past five ready dishes', () => {
    const many = Array.from({ length: 8 }, (_, i) => r(`r${i}`));
    const feed = homeFeed({ ...base, mode: 'pantry', ready: many, nearly });
    assert.equal(feed.heroes.length, HERO_COUNT);
    assert.deepEqual(ids(feed.grid), ['r5', 'r6', 'r7']);
  });
  it('applies the other filters, and the count follows them', () => {
    const quick = r('quick', { prepMinutes: 5, cookMinutes: 5 });
    const feed = homeFeed({ ...base, mode: 'pantry', ready: [...ready, quick], nearly, filters: { time: 'under-15' } });
    assert.deepEqual(ids(feed.heroes.map((h) => h.recipe)), ['quick']);
    assert.equal(feed.readyCount, 1);
    assert.deepEqual(feed.nearly, []);
  });
  it('starts in this mode whenever something is ready', () => {
    assert.equal(defaultHomeMode(3), 'pantry');
    assert.equal(defaultHomeMode(0), 'all');
  });
});

describe('home feed: everything', () => {
  it('leads with the planned dinner, then one ready dish, then picks', () => {
    const feed = homeFeed({ ...base, mode: 'all', tonight: r('planned'), ready: [r('c1'), r('c2')] });
    assert.deepEqual(
      feed.heroes.map((h) => [h.recipe.id, h.reason]),
      [
        ['planned', 'planned'],
        ['c1', 'ready'],
        ['p0', 'pick'],
        ['p1', 'pick'],
        ['p2', 'pick'],
      ],
    );
    assert.deepEqual(ids(feed.grid), ['p3', 'p4', 'p5', 'p6']);
    assert.deepEqual(feed.nearly, []);
  });
  it('never shows a recipe twice', () => {
    const feed = homeFeed({ ...base, mode: 'all', tonight: forYou[0], ready: [forYou[1]!], gridCount: 20 });
    const all = [...ids(feed.heroes.map((h) => h.recipe)), ...ids(feed.grid)];
    assert.equal(new Set(all).size, all.length);
    assert.equal(all.length, forYou.length);
  });
  it('filters the cards and the grid, the planned dinner included', () => {
    const pasta = r('pasta', { cuisine: 'italian' });
    const feed = homeFeed({ ...base, mode: 'all', tonight: r('planned'), forYou: [...forYou, pasta], filters: { cuisine: 'italian' } });
    assert.deepEqual(ids(feed.heroes.map((h) => h.recipe)), ['pasta']);
    assert.equal(feed.grid.length, 0);
  });
  it('ignores a meal or difficulty filter left over from before (Home has only Time and Cuisine)', () => {
    const stale = { meal: 'lunch', difficulty: 'hard' } as unknown as HomeFilters;
    const lunch = r('lunch', { mealTypes: ['lunch'] });
    const feed = homeFeed({ ...base, mode: 'all', forYou: [...forYou, lunch], filters: stale });
    assert.deepEqual(feed, homeFeed({ ...base, mode: 'all', forYou: [...forYou, lunch] }));
    assert.equal(hasHomeFilters(stale), false);
  });
  it('knows when a filter is on', () => {
    assert.equal(hasHomeFilters(NO_HOME_FILTERS), false);
    assert.equal(hasHomeFilters({ time: 'under-30' }), true);
  });
});

describe('card labels', () => {
  it('say why each card is there, never "editor’s pick"', () => {
    assert.equal(heroKicker({ recipe: r('a'), reason: 'planned' }, 'Easy'), 'Tonight · On the plan');
    assert.equal(heroKicker({ recipe: r('a'), reason: 'ready' }, 'Easy'), 'Ready now · Nothing to buy');
    assert.equal(heroKicker({ recipe: r('a'), reason: 'nearly' }, 'Easy', 'Need 1: feta'), 'Need 1: feta');
    assert.equal(heroKicker({ recipe: r('a'), reason: 'pick' }, 'Medium'), 'Picked for you · Medium');
  });
});
