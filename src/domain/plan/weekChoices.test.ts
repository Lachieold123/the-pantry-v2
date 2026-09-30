import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planningDays } from './weekChoices';

describe('the days a recipe can be planned on', () => {
  it('midweek: the rest of this week from today, and all of next week', () => {
    const { thisWeek, nextWeek } = planningDays(new Date(2026, 8, 30, 18)); // Wednesday 30 Sep, 6pm
    assert.deepEqual(
      thisWeek.map((d) => d.iso),
      ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
    );
    assert.deepEqual(thisWeek[0], { iso: '2026-09-30', short: 'Today' });
    assert.deepEqual(thisWeek[1], { iso: '2026-10-01', short: 'Tomorrow' });
    assert.deepEqual(thisWeek[2], { iso: '2026-10-02', short: 'Fri 2' });
    assert.equal(nextWeek.length, 7);
    assert.deepEqual(nextWeek[0], { iso: '2026-10-05', short: 'Mon 5' });
  });
  it('on Sunday, only today is left this week and tomorrow starts next week', () => {
    const { thisWeek, nextWeek } = planningDays(new Date(2026, 9, 4, 9)); // Sunday 4 Oct
    assert.deepEqual(
      thisWeek.map((d) => d.short),
      ['Today'],
    );
    assert.deepEqual(nextWeek[0], { iso: '2026-10-05', short: 'Tomorrow' });
  });
});
