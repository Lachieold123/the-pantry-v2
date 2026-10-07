import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeRecipe } from '../testing/fixtures';
import { dayKind, mealFit, mealWindow, momentOf, quickLimit, seasonFit, seasonFor, timeBudget } from './moment';

const at = (hour: number, minute = 0) => ({ hour, minute });

describe('meal windows', () => {
  it('follows the clock, with dinner leading from mid-afternoon', () => {
    assert.equal(mealWindow(at(4, 59)), 'late');
    assert.equal(mealWindow(at(5)), 'morning');
    assert.equal(mealWindow(at(10, 29)), 'morning');
    assert.equal(mealWindow(at(10, 30)), 'midday');
    assert.equal(mealWindow(at(14, 29)), 'midday');
    assert.equal(mealWindow(at(14, 30)), 'afternoon');
    assert.equal(mealWindow(at(17)), 'evening');
    assert.equal(mealWindow(at(18)), 'evening');
    assert.equal(mealWindow(at(20, 59)), 'evening');
    assert.equal(mealWindow(at(21)), 'late');
    assert.equal(mealWindow(at(0)), 'late');
  });

  it('scores a recipe by its best meal, and dinner never drops low', () => {
    const breakfast = makeRecipe('b', [], { mealTypes: ['breakfast'] });
    const both = makeRecipe('bd', [], { mealTypes: ['breakfast', 'dinner'] });
    const dinner = makeRecipe('d', [], { mealTypes: ['dinner'] });
    const none = makeRecipe('n', [], { mealTypes: [] });
    assert.equal(mealFit(breakfast, 'morning'), 1);
    assert.equal(mealFit(breakfast, 'evening'), 0);
    assert.equal(mealFit(both, 'evening'), 1);
    assert.equal(mealFit(none, 'evening'), 0);
    for (const w of ['morning', 'midday', 'afternoon', 'evening', 'late'] as const) assert.ok(mealFit(dinner, w) >= 0.6, w);
  });
});

describe('weeknights and the time budget', () => {
  it('counts Monday to Thursday as weeknights', () => {
    assert.equal(dayKind('2026-10-05'), 'weeknight'); // Monday
    assert.equal(dayKind('2026-10-08'), 'weeknight'); // Thursday
    assert.equal(dayKind('2026-10-09'), 'weekend'); // Friday
    assert.equal(dayKind('2026-10-10'), 'weekend');
    assert.equal(dayKind('2026-10-11'), 'weekend'); // Sunday
  });

  it('uses the weeknight setting, and gives the weekend more', () => {
    assert.deepEqual(timeBudget('under-30', 'weeknight'), { minutes: 30, told: true });
    assert.deepEqual(timeBudget('under-30', 'weekend'), { minutes: 75, told: true });
    assert.deepEqual(timeBudget('under-60', 'weekend'), { minutes: 90, told: true });
    assert.equal(timeBudget('over-60', 'weeknight').minutes, Infinity);
  });

  it('guesses gently when the cook hasn’t said', () => {
    assert.deepEqual(timeBudget(undefined, 'weeknight'), { minutes: 45, told: false });
    assert.deepEqual(timeBudget(undefined, 'weekend'), { minutes: 75, told: false });
  });

  it('only calls 30 minutes or less quick, or tighter if the cook’s limit is', () => {
    assert.equal(quickLimit(undefined), 30);
    assert.equal(quickLimit('under-60'), 30);
    assert.equal(quickLimit('under-15'), 15);
  });
});

describe('seasons', () => {
  it('uses Australia’s seasons', () => {
    assert.equal(seasonFor('2026-01-15'), 'summer');
    assert.equal(seasonFor('2026-04-15'), 'autumn');
    assert.equal(seasonFor('2026-07-15'), 'winter');
    assert.equal(seasonFor('2026-10-07'), 'spring');
    assert.equal(seasonFor('2026-12-01'), 'summer');
  });

  it('lifts dishes for the season, lowers only the opposite, and leaves the rest', () => {
    const winter = makeRecipe('w', [], { seasons: ['winter'] });
    const coolMonths = makeRecipe('aw', [], { seasons: ['autumn', 'winter'] });
    const anytime = makeRecipe('a', []);
    assert.equal(seasonFit(winter, 'winter'), 1);
    assert.equal(seasonFit(winter, 'summer'), -1);
    assert.equal(seasonFit(winter, 'spring'), 0);
    assert.equal(seasonFit(coolMonths, 'summer'), 0, 'not only for the opposite season');
    assert.equal(seasonFit(anytime, 'summer'), 0);
  });
});

describe('momentOf', () => {
  it('reads the local day, so just before and just after midnight are different days', () => {
    const late = momentOf(new Date(2026, 9, 6, 23, 59));
    const early = momentOf(new Date(2026, 9, 7, 0, 1));
    assert.equal(late.today, '2026-10-06');
    assert.equal(early.today, '2026-10-07');
    assert.equal(late.hour, 23);
    assert.equal(early.minute, 1);
  });
});
