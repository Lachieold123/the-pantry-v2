import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { deriveSignals, mainProtein, NO_HISTORY } from './signals';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 6, 7, 0);
const thai = makeRecipe('thai-1', [], { cuisine: 'thai' });
const thai2 = makeRecipe('thai-2', [], { cuisine: 'thai' });
const italian = makeRecipe('it-1', [], { cuisine: 'italian' });
const byId = new Map([thai, thai2, italian].map((r) => [r.id, r]));
const cook = (recipeId: string, daysAgo: number) => ({ recipeId, cookedAt: NOW - daysAgo * DAY });

describe('deriveSignals', () => {
  it('counts cooks and days since the last one', () => {
    const s = deriveSignals({ ...NO_HISTORY, cookLog: [cook('thai-1', 30), cook('thai-1', 3)] }, byId, NOW);
    assert.equal(s.of('thai-1').cooks, 2);
    assert.equal(s.of('thai-1').daysSinceCooked, 3);
    assert.equal(s.of('it-1').cooks, 0);
    assert.equal(s.of('it-1').daysSinceCooked, undefined);
  });

  it('knows what’s saved, opened lately and planned', () => {
    const s = deriveSignals(
      {
        ...NO_HISTORY,
        bookmarks: [{ recipeId: 'it-1', savedAt: NOW }],
        recentlyViewed: ['thai-2', 'thai-1'],
        plannedThisWeek: new Set(['thai-1']),
      },
      byId,
      NOW,
    );
    assert.equal(s.of('it-1').saved, true);
    assert.equal(s.of('thai-2').viewedRank, 0);
    assert.equal(s.of('thai-1').viewedRank, 1);
    assert.equal(s.of('thai-1').planned, true);
    assert.equal(s.of('it-1').planned, false);
  });

  it('learns a lean towards the cuisines they cook, with the top one at 1', () => {
    const s = deriveSignals({ ...NO_HISTORY, cookLog: [cook('thai-1', 5), cook('thai-2', 9), cook('it-1', 20)] }, byId, NOW);
    assert.equal(s.cuisineAffinity.get('thai'), 1);
    assert.equal(s.cuisineAffinity.get('italian'), 0.5);
    assert.equal(s.cuisineCooks.get('thai'), 2);
    assert.equal(s.totalCooks, 3);
  });

  it('doesn’t read a taste into one opened recipe', () => {
    const s = deriveSignals({ ...NO_HISTORY, recentlyViewed: ['thai-1'] }, byId, NOW);
    assert.equal(s.cuisineAffinity.size, 0);
  });

  it('ignores cooks of recipes that no longer exist, and treats a future cook as today', () => {
    const s = deriveSignals({ ...NO_HISTORY, cookLog: [cook('gone', 2), { recipeId: 'thai-1', cookedAt: NOW + DAY }] }, byId, NOW);
    assert.equal(s.totalCooks, 1);
    assert.equal(s.of('thai-1').daysSinceCooked, 0);
  });

  it('gives a cook with no history nothing at all', () => {
    const s = deriveSignals(NO_HISTORY, byId, NOW);
    assert.deepEqual(s.of('thai-1'), { cooks: 0, daysSinceCooked: undefined, saved: false, viewedRank: undefined, planned: false });
  });
});

describe('mainProtein', () => {
  it('finds the first meat or seafood in the list', () => {
    assert.equal(mainProtein(makeRecipe('a', ['500 g chicken thigh', '200 g bacon']), index), 'poultry');
    assert.equal(mainProtein(makeRecipe('b', ['400 g prawns', '1 onion']), index), 'seafood');
    assert.equal(mainProtein(makeRecipe('c', ['1 onion', '500 g beef mince']), index), 'beef');
  });

  it('has none for meat-free dishes', () => {
    assert.equal(mainProtein(makeRecipe('d', ['1 onion', '400 g chickpeas']), index), undefined);
  });

  it('finds a protein for most of the real catalogue’s meat dishes', () => {
    const meaty = catalogue.filter((r) => !r.diets.includes('vegetarian') && !r.diets.includes('vegan'));
    const found = meaty.filter((r) => mainProtein(r, index) !== undefined).length;
    assert.ok(found / meaty.length > 0.8, `${found} of ${meaty.length}`);
  });
});
