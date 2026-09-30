import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { firstOpenSlot, planWhere, weekAsText, weekProgress } from './summary';
import type { PlanEntry } from './week';

const e = (id: string, day: string, slot: PlanEntry['slot'], recipeId = 'dal'): PlanEntry => ({ id, recipeId, day, slot, servings: 2 });

describe('week summary', () => {
  it('counts filled meal slots out of 21, each slot once', () => {
    const entries = [
      e('1', '2026-09-28', 'dinner'),
      e('2', '2026-09-28', 'dinner', 'salad'),
      e('3', '2026-09-30', 'lunch'),
      e('4', '2026-10-06', 'dinner'),
    ];
    assert.deepEqual(weekProgress(entries, '2026-09-28'), { planned: 2, total: 21 });
  });
  it('writes the plan as text, skipping empty days and missing recipes', () => {
    const text = weekAsText(
      [e('1', '2026-09-30', 'dinner'), e('2', '2026-09-30', 'breakfast', 'oats'), e('3', '2026-10-01', 'dinner', 'gone')],
      '2026-09-28',
      (id) => ({ dal: 'Dal', oats: 'Overnight oats' })[id],
      (d) => (d === '2026-09-30' ? 'Wednesday' : d),
    );
    assert.equal(text, 'Our week\n\nWednesday\n  Breakfast: Overnight oats\n  Dinner: Dal');
  });
  it('is empty for an empty week', () => {
    assert.equal(
      weekAsText(
        [],
        '2026-09-28',
        () => 'x',
        (d) => d,
      ),
      '',
    );
  });
  it('finds the first open meal of a day, in breakfast, lunch, dinner order', () => {
    assert.equal(firstOpenSlot([], '2026-09-30'), 'breakfast');
    assert.equal(firstOpenSlot([e('1', '2026-09-30', 'breakfast')], '2026-09-30'), 'lunch');
    const full = [e('1', '2026-09-30', 'breakfast'), e('2', '2026-09-30', 'lunch'), e('3', '2026-09-30', 'dinner')];
    assert.equal(firstOpenSlot(full, '2026-09-30'), undefined);
  });
});

describe('planWhere (F141, F172)', () => {
  // Wednesday 30 September 2026; the week runs Monday 28 Sep to Sunday 4 Oct.
  const today = '2026-09-30';
  it('says tonight for today’s dinner, and puts the meal first otherwise', () => {
    assert.equal(planWhere(today, 'dinner', today), 'tonight');
    assert.equal(planWhere(today, 'lunch', today), 'lunch today');
    assert.equal(planWhere('2026-10-01', 'breakfast', today), 'breakfast tomorrow');
    assert.equal(planWhere('2026-10-02', 'dinner', today), 'dinner on Friday');
  });
  it('tells next week’s days apart from this week’s', () => {
    assert.equal(planWhere('2026-10-09', 'dinner', today), 'dinner on Friday next week');
    assert.equal(planWhere('2026-10-16', 'dinner', today), 'dinner on Friday 16 Oct');
  });
});
