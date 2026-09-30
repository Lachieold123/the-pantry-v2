import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { containsAvoided } from '../recipes/diets';
import { totalMinutes } from '../recipes/types';
import { catalogue, index } from '../testing/fixtures';
import { forYou, stableJitter, type ForYouInput } from './forYou';

const base: ForYouInput = {
  recipes: catalogue,
  taste: { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined },
  hidden: new Set(),
  planned: new Set(),
  recentlyCooked: [],
  index,
  seed: '2026-09-29',
  count: 3,
};

describe('forYou', () => {
  it('puts loved cuisines that fit the weeknight first', () => {
    const picks = forYou({ ...base, taste: { ...base.taste, cuisines: ['thai'], weeknight: 'under-30' } });
    assert.equal(picks.length, 3);
    for (const p of picks) {
      assert.equal(p.cuisine, 'thai', p.id);
      assert.ok(totalMinutes(p) <= 30, p.id);
    }
  });

  it('never breaks the diet or avoid list, even for picky answers', () => {
    const avoid = { options: ['nuts' as const], custom: ['chickpeas'] };
    const picks = forYou({ ...base, count: 20, taste: { diet: 'vegan', avoid, cuisines: ['british'], weeknight: 'under-30' } });
    assert.ok(picks.length > 0, 'still suggests something');
    for (const p of picks) {
      assert.ok(p.diets.includes('vegan'), p.id);
      assert.equal(containsAvoided(p, avoid, index), false, p.id);
    }
  });

  it('suggests for the meal asked, still within the diet (F131: Add to plan ideas)', () => {
    const picks = forYou({ ...base, count: 10, mealType: 'breakfast', taste: { ...base.taste, diet: 'vegetarian' } });
    assert.ok(picks.length > 0);
    for (const p of picks) {
      assert.ok(p.mealTypes.includes('breakfast'), p.id);
      assert.ok(p.diets.includes('vegetarian'), p.id);
    }
  });

  it('returns nothing, rather than breaking a rule, when no dinner fits', () => {
    const avoid = {
      options: ['nuts' as const, 'soy' as const, 'gluten' as const, 'sesame' as const],
      custom: ['chickpeas', 'lentils', 'beans', 'tofu'],
    };
    const picks = forYou({ ...base, count: 20, taste: { diet: 'vegan', avoid, cuisines: [], weeknight: undefined } });
    for (const p of picks) assert.equal(containsAvoided(p, avoid, index), false, p.id);
  });

  it('only suggests dinners, and nothing hidden', () => {
    const first = forYou(base)[0];
    assert.ok(first);
    const next = forYou({ ...base, hidden: new Set([first.id]), count: 50 });
    assert.ok(next.every((r) => r.id !== first.id && r.mealTypes.includes('dinner')));
  });

  it('keeps the same order all day, and changes it the next', () => {
    assert.deepEqual(
      forYou(base).map((r) => r.id),
      forYou(base).map((r) => r.id),
    );
    assert.notDeepEqual(
      forYou({ ...base, count: 10 }).map((r) => r.id),
      forYou({ ...base, count: 10, seed: '2026-09-30' }).map((r) => r.id),
    );
  });

  it('moves planned and recently cooked dishes down', () => {
    const top = forYou(base)[0];
    assert.ok(top);
    assert.notEqual(forYou({ ...base, planned: new Set([top.id]) })[0]?.id, top.id);
    assert.notEqual(forYou({ ...base, recentlyCooked: [top.id] })[0]?.id, top.id);
  });
});

describe('stableJitter', () => {
  it('is between 0 and 1 and repeatable', () => {
    const a = stableJitter('s', 'x');
    assert.ok(a >= 0 && a <= 1);
    assert.equal(a, stableJitter('s', 'x'));
  });
});
