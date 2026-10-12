import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index, kitchen, makeRecipe } from '../testing/fixtures';
import { DEFAULT_SHELF, whatCanICook } from './cookable';
import { savedMatches, savedNeedLine, suggestedMatches, tierCounts } from './shelves';

const ready = makeRecipe('ready', ['2 garlic cloves', '400g tinned chickpeas', '1 tsp ground cumin']);
const needOne = makeRecipe('need-one', ['2 garlic cloves', '400g tinned chickpeas', '100g feta']);
const needFive = makeRecipe('need-five', ['2 garlic cloves', '100g feta', '1 lemon', '200g rice', '1 carrot', '2 eggs']);
const nothing = makeRecipe('nothing', ['100g feta', '1 lemon']);
const recipes = [ready, needOne, needFive, nothing];
const have = new Set(['garlic', 'chickpeas']);
const base = { recipes, have, shelf: DEFAULT_SHELF, index, kitchen };
const name = (id: string) => index.byId.get(id)?.name ?? id;

describe('from your saved', () => {
  it('lists saved recipes that use the cupboard, fewest to buy first, whatever the save order', () => {
    const got = savedMatches({ ...base, saved: ['need-five', 'need-one', 'ready'] }).map((m) => m.recipe.id);
    assert.deepEqual(got, ['ready', 'need-one', 'need-five']);
  });
  it('keeps a saved recipe that needs more than two things, unlike the engine’s tiers', () => {
    const [m] = savedMatches({ ...base, saved: ['need-five'] });
    assert.ok(m && !m.ready);
    assert.equal(m.result.missing.length, 5);
  });
  it('leaves out a saved recipe that shares nothing with the cupboard', () => {
    assert.deepEqual(savedMatches({ ...base, saved: ['nothing'] }), []);
  });
  it('leaves out a saved recipe this cook won’t eat (it isn’t in the recipes passed in)', () => {
    assert.deepEqual(savedMatches({ ...base, recipes: [needOne], saved: ['ready'] }), []);
  });
  it('gives nothing for an empty cupboard or no saved recipes', () => {
    assert.deepEqual(savedMatches({ ...base, have: new Set(), saved: ['ready'] }), []);
    assert.deepEqual(savedMatches({ ...base, saved: [] }), []);
  });
  it('breaks a tie by the newest save', () => {
    const twin = makeRecipe('twin', ['2 garlic cloves', '400g tinned chickpeas', '1 tsp ground cumin']);
    const got = savedMatches({ ...base, recipes: [...recipes, twin], saved: ['twin', 'ready'] }).map((m) => m.recipe.id);
    assert.deepEqual(got, ['twin', 'ready']);
  });
  it('says what a saved card needs, and only the count past two', () => {
    const [r, one, five] = savedMatches({ ...base, saved: ['ready', 'need-one', 'need-five'] });
    assert.equal(savedNeedLine(r!.result, name), 'Ready to cook');
    assert.equal(savedNeedLine(one!.result, name), `Need 1: ${name('feta')}`);
    assert.equal(savedNeedLine(five!.result, name), '5 to buy');
  });
});

describe('suggested for you', () => {
  const engine = whatCanICook({ ...base, saved: new Set(), seed: 'd' });
  it('is the engine’s matches, ready first, without the ones the saved shelf shows', () => {
    const fromSaved = savedMatches({ ...base, saved: ['ready'] });
    const got = suggestedMatches(engine.ready, engine.nearly, fromSaved).map((m) => m.recipe.id);
    assert.deepEqual(got, ['need-one']);
  });
  it('is everything the engine found when nothing is saved', () => {
    const got = suggestedMatches(engine.ready, engine.nearly, []).map((m) => m.recipe.id);
    assert.deepEqual(got, ['ready', 'need-one']);
  });
  it('counts its tiers from what it shows', () => {
    assert.deepEqual(tierCounts(suggestedMatches(engine.ready, engine.nearly, [])), { ready: 1, nearly: 1 });
    assert.deepEqual(tierCounts([]), { ready: 0, nearly: 0 });
  });
});
