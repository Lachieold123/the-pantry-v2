import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cookable, coverShare, needLine, tierOf, type Shelf } from '../cupboard/cookable';
import { hierarchy, index, kitchen, makeRecipe } from '../testing/fixtures';
import { blocksMatch } from './hierarchy';

const model = kitchen.model!;
const shelf: Shelf = { mode: 'mine', ids: [] };
const has = (...ids: string[]) => new Set(ids);

describe('ingredient model', () => {
  it('a variety generic covers its kinds: potatoes cover waxy, desiree and kipfler', () => {
    assert.equal(model.bestCover('waxy-potato', has('potato'))?.kind, 'variety');
    assert.equal(index.match('desiree potatoes'), 'waxy-potato');
    assert.equal(index.match('kipfler'), 'waxy-potato');
    const c = cookable(makeRecipe('r', ['500 g kipfler potatoes']), has('potato'), shelf, index, kitchen);
    assert.deepEqual(c.missing, []);
  });
  it('a kind covers its generic, but a non-variety generic does not cover the kind', () => {
    assert.equal(model.bestCover('cheddar', has('tasty-cheese'))?.kind, 'specific');
    assert.equal(model.bestCover('pasta', has('spaghetti'))?.kind, 'specific');
    assert.equal(model.bestCover('mozzarella', has('fresh-mozzarella'))?.kind, 'specific');
    assert.equal(model.bestCover('fresh-mozzarella', has('mozzarella'))?.kind, 'substitute');
    assert.equal(model.bestCover('pasta', has('rice-noodles')), undefined);
  });
  it('works both ways: a pantry item lists what it covers', () => {
    const covered = model.coveredBy('pasta').map((c) => c.id);
    for (const shape of ['spaghetti', 'penne', 'orzo']) assert.ok(covered.includes(shape), shape);
    assert.ok(model.coveredBy('spaghetti').some((c) => c.id === 'pasta' && c.kind === 'specific'));
  });
  it('knows AU, UK and US names', () => {
    assert.equal(index.match('bell pepper'), 'capsicum');
    assert.equal(index.match('cilantro'), 'coriander');
    assert.equal(index.match('ground beef'), 'beef-mince');
    assert.equal(index.match('aubergine'), 'eggplant');
    assert.equal(index.match('courgettes'), 'zucchini');
    assert.equal(index.match('sweet potato'), 'sweet-potato');
  });
  it('substitutes earn partial credit and only count when switched on', () => {
    const recipe = makeRecipe('r', ['2 tsp thyme leaves', '1 lemon']);
    const off = cookable(recipe, has('dried-thyme', 'lemon'), shelf, index, kitchen);
    assert.deepEqual(off.missing, ['thyme']);
    assert.deepEqual(off.partial, [{ need: 'thyme', use: 'dried-thyme' }]);
    assert.equal(coverShare(off), 0.75);
    assert.match(
      needLine(off, (id) => index.byId.get(id)?.name ?? id),
      /or your/,
    );
    const on = cookable(recipe, has('dried-thyme', 'lemon'), { ...shelf, substitutes: true }, index, kitchen);
    assert.equal(tierOf(on), 'ready');
  });
  it('water, salt and pepper are always in; oil only while the oil switch is on', () => {
    const recipe = makeRecipe('r', ['2 tbsp olive oil', '1 tsp salt', '1 cup water', '2 eggs']);
    assert.deepEqual(cookable(recipe, has('egg'), shelf, index, kitchen).missing, []);
    assert.deepEqual(cookable(recipe, has('egg'), { ...shelf, oil: false }, index, kitchen).missing, ['olive-oil']);
  });
  it('garnish, "to serve" and optional lines never block, but "plus extra to serve" still needs it', () => {
    const line = (raw: string, extra: object = {}) => ({ raw, quantity: 1, ...extra });
    assert.equal(blocksMatch(line('coriander, to serve')), false);
    assert.equal(blocksMatch(line('1 lime, cut into wedges', { note: 'to garnish' })), false);
    assert.equal(blocksMatch(line('feta', { optional: true })), false);
    assert.equal(blocksMatch(line('200 g feta, plus extra to serve')), true);
    assert.equal(blocksMatch(line('2 tbsp fish sauce')), true);
  });
  it('fixes the generator’s bad links: salt cod is not salt, a whole fish is a fish', () => {
    assert.equal(model.relink({ item: 'salt cod loin', raw: '400 g salt cod loin', ingredientId: 'salt' }), 'unknown:salt-cod');
    assert.equal(model.relink({ item: 'whole', raw: '1 whole fish (about 800 g), cleaned', ingredientId: 'whole' }), 'white-fish');
    assert.equal(model.relink({ item: 'whole', raw: '4 whole cloves', ingredientId: 'whole' }), 'whole-cloves');
    assert.equal(model.relink({ item: 'whole', raw: '2 whole mackerel (about 400 g)', ingredientId: 'whole' }), 'mackerel'); // mackerel joined the database with main's batches
    assert.equal(model.relink({ item: 'Salt and black pepper', raw: 'Salt and black pepper, to taste', ingredientId: 'salt' }), 'salt');
    const c = cookable(makeRecipe('r', ['1 egg']), has('egg'), shelf, index, kitchen);
    assert.equal(tierOf(c), 'ready');
  });
  it('every id in the data file exists (the model throws on a typo)', () => {
    assert.ok(Object.keys(hierarchy.parents).length > 20);
  });
});
