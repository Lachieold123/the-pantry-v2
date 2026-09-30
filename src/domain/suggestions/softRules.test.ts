// Surprise me and "for you" on small hand-made pools, so each soft rule is
// checked on its own rather than lost in 285 recipes (audit F210).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NO_FILTERS } from '../recipes/search';
import { index, makeRecipe } from '../testing/fixtures';
import { forYou, stableJitter, type ForYouInput } from './forYou';
import { pickSurprise, type SurpriseInput } from './surprise';

const pool = ['a', 'b', 'c'].map((id) => makeRecipe(id, ['1 egg']));

const surprise: SurpriseInput = {
  recipes: pool,
  filters: NO_FILTERS,
  diet: 'everything',
  avoid: { options: [], custom: [] },
  hidden: new Set(),
  planned: new Set(),
  recentlyCooked: [],
  alreadyShown: [],
  index,
  random: () => 0,
};
const pick = (overrides: Partial<SurpriseInput>) => pickSurprise({ ...surprise, ...overrides })?.id;

describe('Surprise me: soft rules', () => {
  it('can pick every recipe in the pool, first to last', () => {
    assert.equal(pick({ random: () => 0 }), 'a');
    assert.equal(pick({ random: () => 0.5 }), 'b');
    assert.equal(pick({ random: () => 0.999 }), 'c');
  });
  it('stays inside the pool even if the random source returns 1', () => {
    assert.equal(pick({ random: () => 1 }), 'c');
  });
  it('skips dishes already shown this session', () => {
    assert.equal(pick({ alreadyShown: ['a', 'b'] }), 'c');
  });
  it('skips every recent cook, not just the last one', () => {
    assert.equal(pick({ recentlyCooked: ['a', 'b'] }), 'c');
  });
  it('lets a dish back once it is more than 14 cooks ago', () => {
    const fourteen = Array.from({ length: 14 }, (_, i) => `other-${i}`);
    assert.equal(pick({ recipes: [pool[0]!], recentlyCooked: [...fourteen, 'a'] }), 'a');
    assert.equal(pick({ recentlyCooked: ['b', ...fourteen.slice(1), 'a'] }), 'a');
  });
  it('gives a rule up when it would leave nothing, but keeps the earlier ones', () => {
    // Planned narrows to b and c; shown would leave nothing, so it is dropped.
    assert.equal(pick({ planned: new Set(['a']), alreadyShown: ['b', 'c'], random: () => 0.999 }), 'c');
  });
});

const SEED = '2026-09-29';
const forYouBase: ForYouInput = {
  recipes: [],
  taste: { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined },
  hidden: new Set(),
  planned: new Set(),
  recentlyCooked: [],
  index,
  seed: SEED,
  count: 5,
};

describe('for you: soft rules', () => {
  it('a dinner that takes exactly the weeknight time counts as fitting it', () => {
    const quick = makeRecipe('quick', ['1 egg'], { prepMinutes: 10, cookMinutes: 20 });
    const slow = makeRecipe('slow', ['1 egg'], { prepMinutes: 10, cookMinutes: 21 });
    // So only the time boost can put "quick" first.
    assert.ok(stableJitter(SEED, 'quick') < stableJitter(SEED, 'slow'));
    const picks = forYou({ ...forYouBase, recipes: [slow, quick], taste: { ...forYouBase.taste, weeknight: 'under-30' } });
    assert.deepEqual(
      picks.map((r) => r.id),
      ['quick', 'slow'],
    );
  });
  it('a cook-tested recipe ranks ahead of an equal draft', () => {
    const tested = makeRecipe('tested', ['1 egg'], { provenance: 'vetted' });
    const draft = makeRecipe('draft', ['1 egg'], { provenance: 'ai-draft' });
    assert.ok(stableJitter(SEED, 'tested') < stableJitter(SEED, 'draft'));
    assert.deepEqual(
      forYou({ ...forYouBase, recipes: [draft, tested] }).map((r) => r.id),
      ['tested', 'draft'],
    );
  });
});
