import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  entriesInWeek,
  fromISODate,
  isISODate,
  isPlanEntry,
  plannableDay,
  pruneDay,
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
  });
  it('moves on to a second dinner once the first is cooked (F22)', () => {
    const two: PlanEntry[] = [...entries, { id: 'e', recipeId: 'w', day: '2026-09-29', slot: 'dinner', servings: 2 }];
    assert.equal(tonightsDinner(two, '2026-09-29', new Set(['x']))?.id, 'e');
    // All cooked: the first comes back, for the caller to show as done.
    assert.equal(tonightsDinner(two, '2026-09-29', new Set(['x', 'w']))?.id, 'a');
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

describe('pruning high-water mark (audit F08)', () => {
  it('starts from today on the first launch', () => {
    assert.deepEqual(pruneDay(undefined, '2026-09-30'), { day: '2026-09-30', seen: '2026-09-30' });
  });
  it('follows the clock day by day', () => {
    assert.deepEqual(pruneDay('2026-09-29', '2026-09-30'), { day: '2026-09-30', seen: '2026-09-30' });
  });
  it('moves at most two weeks when the clock jumps a year ahead, so the plan survives', () => {
    const { day, seen } = pruneDay('2026-09-30', '2027-09-30');
    assert.equal(day, '2026-10-14');
    assert.equal(seen, '2026-10-14');
    const plan: PlanEntry[] = [{ id: 'a', recipeId: 'x', day: '2026-10-01', slot: 'dinner', servings: 2 }];
    assert.equal(pruneOldEntries(plan, day).length, 1);
  });
  it('never moves the mark backwards when the clock goes back', () => {
    assert.deepEqual(pruneDay('2026-10-14', '2026-09-30'), { day: '2026-09-30', seen: '2026-10-14' });
  });
  it('ignores a corrupt mark', () => {
    assert.deepEqual(pruneDay('soon', '2026-09-30'), { day: '2026-09-30', seen: '2026-09-30' });
  });
});

describe('saved plan entries', () => {
  it('keeps good entries and drops wrong-shaped ones', () => {
    const good = { id: 'a', recipeId: 'x', day: '2026-10-01', slot: 'dinner', servings: 2 };
    assert.ok(isPlanEntry(good));
    for (const bad of [null, 'x', { ...good, day: 'tomorrow' }, { ...good, slot: 'brunch' }, { ...good, servings: '2' }]) {
      assert.ok(!isPlanEntry(bad), JSON.stringify(bad));
    }
  });
});

describe('a day to plan on from a link (F144)', () => {
  const today = '2026-09-30'; // a Wednesday; next week ends Sunday 11 October
  it('keeps a day in the two weeks the Plan tab shows', () => {
    assert.equal(plannableDay('2026-10-04', today), '2026-10-04');
    assert.equal(plannableDay(today, today), today);
  });
  it('clamps the past to today and the far future to the end of next week', () => {
    assert.equal(plannableDay('2026-09-01', today), today);
    assert.equal(plannableDay('2099-01-01', today), '2026-10-11');
  });
  it('falls back to today for garbage', () => {
    assert.equal(plannableDay('soon', today), today);
    assert.equal(plannableDay(undefined, today), today);
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
