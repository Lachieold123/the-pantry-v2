import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeRecipe } from '../testing/fixtures';
import { dailyPicks, moods, presetActive, quickChips, recipeOfTheDay, recipesFor, togglePreset } from './browse';
import { NO_FILTERS } from './search';
import type { Recipe } from './types';

const recipe = (o: Partial<Recipe> & { id: string }): Recipe => makeRecipe(o.id, ['1 onion'], o);

const chips = quickChips('spring');
const chip = (id: string) => {
  const c = chips.find((x) => x.id === id);
  assert.ok(c);
  return c;
};

describe('quick chips', () => {
  it('turn a filter on and off again, leaving other filters alone', () => {
    const start = { ...NO_FILTERS, cuisines: ['thai' as const] };
    const on = togglePreset(chip('vegan'), start, '');
    assert.equal(on.filters.diet, 'vegan');
    assert.ok(presetActive(chip('vegan'), on.filters, on.query));
    const off = togglePreset(chip('vegan'), on.filters, on.query);
    assert.deepEqual(off.filters, start);
  });
  it('word chips search, and clear the search when turned off', () => {
    const on = togglePreset(chip('pasta'), NO_FILTERS, '');
    assert.equal(on.query, 'pasta');
    assert.ok(presetActive(chip('pasta'), on.filters, 'Pasta '));
    assert.equal(togglePreset(chip('pasta'), on.filters, on.query).query, '');
  });
  it('a list filter counts as on only when it matches exactly', () => {
    assert.ok(!presetActive(chip('easy'), { ...NO_FILTERS, difficulties: ['easy', 'hard'] }, ''));
  });
});

describe('moods', () => {
  it('select by real recipe data', () => {
    const quick = recipe({ id: 'q', prepMinutes: 5, cookMinutes: 10 });
    const slow = recipe({ id: 's', prepMinutes: 30, cookMinutes: 90 });
    const under30 = moods('spring').find((m) => m.id === 'under-30');
    assert.ok(under30);
    assert.deepEqual(
      recipesFor(under30, [quick, slow]).map((r) => r.id),
      ['q'],
    );
  });
});

describe('daily picks', () => {
  const many = Array.from({ length: 20 }, (_, i) => recipe({ id: `r${i}`, mealTypes: ['dinner'] }));
  it('are stable within a day and change between days', () => {
    assert.deepEqual(dailyPicks(many, '2026-09-30', 4), dailyPicks(many, '2026-09-30', 4));
    assert.notDeepEqual(dailyPicks(many, '2026-09-30', 4), dailyPicks(many, '2026-10-01', 4));
  });
  it('recipe of the day prefers a dinner with a photo', () => {
    const pick = recipeOfTheDay(many, '2026-09-30', (r) => r.id === 'r7');
    assert.equal(pick?.id, 'r7');
  });
  it('is empty-safe', () => {
    assert.equal(
      recipeOfTheDay([], '2026-09-30', () => true),
      undefined,
    );
  });
});
