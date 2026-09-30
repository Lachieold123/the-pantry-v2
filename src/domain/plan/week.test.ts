import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  entriesInWeek,
  fromISODate,
  isISODate,
  pruneOldEntries,
  tonightsDinner,
  upcomingCount,
  shoppingWeek,
  visibleWeeks,
  weekDays,
  weekStart,
  type PlanEntry,
} from './week';

describe('week plan dates', () => {
  it('weeks start on Monday', () => {
    assert.equal(weekStart('2026-10-01'), '2026-09-28'); // Thursday → Monday
    assert.equal(weekStart('2026-09-28'), '2026-09-28'); // Monday stays
    assert.equal(weekStart('2026-10-04'), '2026-09-28'); // Sunday belongs to the week before
  });
  it('shows this week and next', () => {
    assert.deepEqual(visibleWeeks('2026-10-04'), { thisWeek: '2026-09-28', nextWeek: '2026-10-05' });
    assert.equal(weekDays('2026-09-28').length, 7);
  });
  it('crosses month, year and daylight-saving boundaries cleanly', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-10-03', 2), '2026-10-05'); // NSW clocks go forward 4 Oct 2026
    assert.equal(weekStart('2027-01-01'), '2026-12-28');
  });
  it('checks a value is a real date', () => {
    assert.ok(isISODate('2026-10-05'));
    assert.ok(!isISODate('2026-02-30'));
    assert.ok(!isISODate(undefined));
  });
  it('rejects impossible dates', () => {
    assert.throws(() => fromISODate('2026-02-30'));
    assert.throws(() => fromISODate('tomorrow'));
  });
  const entries: PlanEntry[] = [
    { id: 'a', recipeId: 'x', day: '2026-09-29', slot: 'dinner', servings: 2 },
    { id: 'b', recipeId: 'y', day: '2026-09-29', slot: 'lunch', servings: 2 },
    { id: 'c', recipeId: 'z', day: '2026-10-06', slot: 'dinner', servings: 2 },
    { id: 'd', recipeId: 'old', day: '2026-06-01', slot: 'dinner', servings: 2 },
  ];
  it('finds tonight’s dinner and the entries in a week', () => {
    assert.equal(tonightsDinner(entries, '2026-09-29')?.id, 'a');
    assert.equal(tonightsDinner(entries, '2026-09-30'), undefined);
    assert.deepEqual(
      entriesInWeek(entries, '2026-09-28').map((e) => e.id),
      ['a', 'b'],
    );
  });
  it('prunes entries older than 8 weeks', () => {
    assert.deepEqual(
      pruneOldEntries(entries, '2026-09-29').map((e) => e.id),
      ['a', 'b', 'c'],
    );
  });
});

describe('upcoming meals', () => {
  const entry = (day: string): PlanEntry => ({ id: day, recipeId: 'r', day, slot: 'dinner', servings: 2 });
  it('counts today and later, never the past', () => {
    assert.equal(upcomingCount([entry('2026-09-29'), entry('2026-09-30'), entry('2026-10-06')], '2026-09-30'), 2);
  });
  it('is zero for an empty plan', () => {
    assert.equal(upcomingCount([], '2026-09-30'), 0);
  });
});

describe('the week you shop for', () => {
  it('is this week, except on Sunday when it is the week ahead', () => {
    assert.equal(shoppingWeek('2026-09-30'), '2026-09-28'); // Wednesday
    assert.equal(shoppingWeek('2026-10-04'), '2026-10-05'); // Sunday
  });
});
