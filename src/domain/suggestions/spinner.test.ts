import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Cookable } from '../cupboard/cookable';
import { makeRecipe } from '../testing/fixtures';
import { deckPosition, DEFAULT_SPIN, SPIN_DELAYS, spinLanding, spinPool, spinReasons, spinReel } from './spinner';

const quick = makeRecipe('quick', ['1 egg'], { prepMinutes: 5, cookMinutes: 5 });
const dinner = makeRecipe('dinner', ['1 egg'], { prepMinutes: 10, cookMinutes: 30 });
const slow = makeRecipe('slow', ['1 egg'], { prepMinutes: 20, cookMinutes: 100 });
const lunch = makeRecipe('lunch', ['1 egg'], { mealTypes: ['lunch'] });
const all = [quick, dinner, slow, lunch];
const none = { current: undefined, planned: new Set<string>(), recentlyCooked: [], shown: [] };

describe('the spinner deck', () => {
  it('starts on dinners of 45 minutes or less', () => {
    assert.deepEqual(
      spinPool(all, DEFAULT_SPIN, new Set()).map((r) => r.id),
      ['quick', 'dinner'],
    );
  });
  it('narrows by meal, time and what the cupboard can make', () => {
    assert.deepEqual(
      spinPool(all, { meal: 'lunch', time: undefined, fromCupboard: false }, new Set()).map((r) => r.id),
      ['lunch'],
    );
    assert.deepEqual(
      spinPool(all, { meal: undefined, time: 'under-15', fromCupboard: false }, new Set()).map((r) => r.id),
      ['quick'],
    );
    assert.deepEqual(
      spinPool(all, { meal: undefined, time: 'over-60', fromCupboard: false }, new Set()).map((r) => r.id),
      ['slow'],
    );
    assert.deepEqual(
      spinPool(all, { meal: undefined, time: undefined, fromCupboard: true }, new Set(['slow'])).map((r) => r.id),
      ['slow'],
    );
  });
  it('counts a card’s place in the deck from one', () => {
    assert.equal(deckPosition(all, 'slow'), 3);
    assert.equal(deckPosition(all, 'gone'), 1);
  });
});

describe('a spin', () => {
  it('never lands on the card it started from while there is another', () => {
    for (let i = 0; i < 20; i++) assert.notEqual(spinLanding(all, { ...none, current: 'quick' }, () => i / 20)?.id, 'quick');
    assert.equal(spinLanding([quick], { ...none, current: 'quick' }, () => 0)?.id, 'quick');
  });
  it('prefers dishes not planned, cooked lately or already seen', () => {
    const leave = { current: 'quick', planned: new Set(['dinner']), recentlyCooked: ['slow'], shown: [] };
    assert.equal(spinLanding(all, leave, () => 0.99)?.id, 'lunch');
  });
  it('flashes one card per tick, never the same twice running, and ends on the landing', () => {
    const reel = spinReel(all, 'quick', slow, () => 0.3);
    assert.equal(reel.length, SPIN_DELAYS.length);
    assert.equal(reel.at(-1)?.id, 'slow');
    let last = 'quick';
    for (const r of reel) {
      assert.notEqual(r.id, last);
      last = r.id;
    }
  });
  it('copes with a deck of one', () => {
    assert.deepEqual(
      spinReel([quick], 'quick', quick, () => 0).map((r) => r.id),
      SPIN_DELAYS.map(() => 'quick'),
    );
  });
});

describe('why this', () => {
  const name = (id: string) => id;
  const result = (missing: string[]): Cookable => ({ have: ['egg', 'rice'], swaps: [], shelf: [], missing, perishablesUsed: 0 });
  it('only says true things', () => {
    const reasons = spinReasons({ recipe: dinner, cupboard: result([]), saved: false, cooked: false, nameOf: name });
    assert.deepEqual(reasons, [
      { key: 'Pantry', value: 'Uses 2 things you have. Ready to cook' },
      { key: 'Time', value: '40m · 10m prep, 30m cooking' },
      { key: 'For you', value: 'Something you haven’t cooked yet' },
    ]);
  });
  it('lists what to buy, up to three', () => {
    const [cupboard] = spinReasons({ recipe: dinner, cupboard: result(['a', 'b', 'c', 'd']), saved: true, cooked: true, nameOf: name });
    assert.equal(cupboard?.value, 'Uses 2 things you have. Need 4: a, b, c and more');
  });
  it('leaves the cupboard out when it’s empty, and names saved dishes', () => {
    const reasons = spinReasons({ recipe: dinner, cupboard: undefined, saved: true, cooked: true, nameOf: name });
    assert.deepEqual(
      reasons.map((r) => r.key),
      ['Time', 'For you'],
    );
    assert.equal(reasons[1]?.value, 'In your Cookmarks');
  });
});
