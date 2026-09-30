// The edges of the week plan, where an off-by-one is invisible most days and
// wrong on exactly one (audit F210: these mutations all survived before).
// `npm run test:domain` runs in Australia/Sydney, so the daylight-saving cases are real.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, entriesInWeek, isPast, pruneCutoff, pruneOldEntries, weekDays, type PlanEntry } from './week';

const entry = (day: string): PlanEntry => ({ id: day, recipeId: 'r', day, slot: 'dinner', servings: 2 });

describe('week boundaries', () => {
  it('a week runs Monday to Sunday: next Monday belongs to next week', () => {
    const plan = ['2026-09-27', '2026-09-28', '2026-10-04', '2026-10-05'].map(entry);
    assert.deepEqual(
      entriesInWeek(plan, '2026-09-28').map((e) => e.day),
      ['2026-09-28', '2026-10-04'],
    );
  });
  it('today is not in the past, yesterday is', () => {
    assert.equal(isPast('2026-09-30', '2026-09-30'), false);
    assert.equal(isPast('2026-09-29', '2026-09-30'), true);
    assert.equal(isPast('2026-10-01', '2026-09-30'), false);
  });
  it('pruning keeps exactly eight whole weeks before this one', () => {
    // Wednesday 30 Sep: this week starts Monday 28 Sep, eight weeks before is Monday 3 Aug.
    assert.equal(pruneCutoff('2026-09-30'), '2026-08-03');
    assert.deepEqual(
      pruneOldEntries(['2026-08-02', '2026-08-03', '2026-09-01'].map(entry), '2026-09-30').map((e) => e.day),
      ['2026-08-03', '2026-09-01'],
    );
  });
  it('adds calendar days, not 24 hours, across the April 2027 daylight-saving change in Sydney', () => {
    // Clocks go back at 3am on Sunday 4 April 2027, so that day is 25 hours long.
    assert.equal(addDays('2027-04-03', 1), '2027-04-04');
    assert.equal(addDays('2027-04-04', 1), '2027-04-05');
    assert.equal(addDays('2027-04-05', -1), '2027-04-04');
    assert.deepEqual(weekDays('2027-03-29'), [
      '2027-03-29',
      '2027-03-30',
      '2027-03-31',
      '2027-04-01',
      '2027-04-02',
      '2027-04-03',
      '2027-04-04',
    ]);
  });
});
