import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index, kitchen, makeRecipe } from '../testing/fixtures';
import { cookable, DEFAULT_SHELF, needLine, quickAdds, tierOf, whatCanICook, type Shelf } from './cookable';

const ONLY_MINE: Shelf = { mode: 'mine', ids: [] };
const dish = makeRecipe('dish', [
  '1 white onion',
  '2 garlic cloves',
  '400g tinned chickpeas',
  '1 tsp ground cumin',
  '1 tsp salt',
  '100g feta',
  '1 lemon (optional)',
  'parsley, to serve',
]);

describe('what can I cook', () => {
  it('sorts each ingredient: have, swap, staple, shelf, missing', () => {
    const c = cookable(dish, new Set(['brown-onion', 'garlic', 'chickpeas']), DEFAULT_SHELF, index, kitchen);
    assert.deepEqual(c.have, ['garlic', 'chickpeas']);
    assert.deepEqual(c.swaps, [{ need: 'white-onion', use: 'brown-onion' }]);
    assert.deepEqual(c.shelf, ['ground-cumin']);
    assert.deepEqual(c.missing, ['feta']);
  });
  it('ignores salt, optional lines and unquantified "to serve" lines', () => {
    const c = cookable(dish, new Set(), DEFAULT_SHELF, index, kitchen);
    const counted = [...c.have, ...c.shelf, ...c.missing, ...c.swaps.map((s) => s.need)];
    for (const id of ['salt', 'lemon', 'parsley']) assert.ok(!counted.includes(id), id);
  });
  it('only counts shelf items you ticked when you choose "only what I tick"', () => {
    const c = cookable(dish, new Set(['garlic']), ONLY_MINE, index, kitchen);
    assert.ok(c.missing.includes('ground-cumin'));
    const ticked = cookable(dish, new Set(['garlic']), { mode: 'mine', ids: ['ground-cumin'] }, index, kitchen);
    assert.ok(ticked.shelf.includes('ground-cumin'));
  });
  it('does not swap across ingredients that are not interchangeable', () => {
    const c = cookable(makeRecipe('r', ['1 red onion']), new Set(['brown-onion']), DEFAULT_SHELF, index, kitchen);
    assert.deepEqual(c.missing, ['red-onion']);
  });
  it('tiers: ready at 0 missing, nearly at 1–2, hidden at 3+ or when nothing is used from the cupboard', () => {
    const base = { have: ['garlic'], swaps: [], shelf: [], perishablesUsed: 0 };
    assert.equal(tierOf({ ...base, missing: [] }), 'ready');
    assert.equal(tierOf({ ...base, missing: ['a', 'b'] }), 'nearly');
    assert.equal(tierOf({ ...base, missing: ['a', 'b', 'c'] }), undefined);
    assert.equal(tierOf({ ...base, have: [], missing: [] }), undefined);
  });
  it('an empty cupboard gives nothing, never a random list', () => {
    const r = whatCanICook({ recipes: catalogue, have: new Set(), shelf: DEFAULT_SHELF, index, kitchen, saved: new Set(), seed: 'd' });
    assert.deepEqual(r, { ready: [], nearly: [] });
  });
  it('a well-stocked kitchen finds real recipes, and every card is honest about what is missing', () => {
    const have = new Set([
      'brown-onion',
      'garlic',
      'carrot',
      'potato',
      'egg',
      'milk',
      'butter',
      'cheddar',
      'chicken-thigh',
      'tinned-tomatoes',
      'pasta',
      'white-rice',
      'lemon',
      'ginger',
      'spring-onion',
      'capsicum',
      'beef-mince',
      'parmesan',
      'plain-flour',
      'chickpeas',
    ]);
    const r = whatCanICook({ recipes: catalogue, have, shelf: DEFAULT_SHELF, index, kitchen, saved: new Set(), seed: 'd' });
    assert.ok(r.ready.length + r.nearly.length >= 10, `${r.ready.length} ready, ${r.nearly.length} nearly`);
    for (const m of r.ready) assert.equal(m.result.missing.length, 0);
    for (const m of r.nearly) assert.ok(m.result.missing.length >= 1 && m.result.missing.length <= 2);
  });
  it('saved recipes rank ahead of equal matches', () => {
    const a = makeRecipe('a', ['1 garlic clove', '1 brown onion']);
    const b = makeRecipe('b', ['1 garlic clove', '1 brown onion']);
    const input = { recipes: [a, b], have: new Set(['garlic', 'brown-onion']), shelf: DEFAULT_SHELF, index, kitchen, seed: 'd' };
    assert.equal(whatCanICook({ ...input, saved: new Set(['b']) }).ready[0]?.recipe.id, 'b');
    assert.equal(whatCanICook({ ...input, saved: new Set(['a']) }).ready[0]?.recipe.id, 'a');
  });
  it('names what is missing instead of a percentage', () => {
    const c = cookable(dish, new Set(['garlic']), DEFAULT_SHELF, index, kitchen);
    assert.match(
      needLine(c, (id) => index.byId.get(id)?.name ?? id),
      /^Need \d: /,
    );
  });
});

describe('quick adds', () => {
  it('are the main ingredients recipes use most, never staples, shelf items or what you have', () => {
    const picks = quickAdds(catalogue, new Set(['garlic']), index, kitchen);
    assert.equal(picks.length, 10);
    assert.ok(!picks.includes('garlic'));
    for (const id of picks) assert.ok(!kitchen.isShelf(id) && !index.byId.get(id)?.staple, id);
  });
});

describe('kitchen data', () => {
  it('knows shelf items and fresh food apart', () => {
    assert.ok(kitchen.isShelf('ground-cumin'));
    assert.ok(!kitchen.isShelf('salt'), 'staples are separate');
    assert.ok(kitchen.isPerishable('feta'));
    assert.ok(!kitchen.isPerishable('ground-cumin'));
  });
  it('files every ingredient into one of the cupboard jars', () => {
    assert.equal(kitchen.category('chicken-thigh'), 'proteins');
    assert.equal(kitchen.category('lemon'), 'fruit');
    assert.equal(kitchen.category('parsley'), 'herbs');
    assert.equal(kitchen.category('egg'), 'dairy');
    assert.equal(kitchen.category('udon-noodles'), 'pantry');
  });
});
