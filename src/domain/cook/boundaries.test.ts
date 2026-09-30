// Cook Mode's edges: the streak's week boundary, the longest timer, and the
// last second of a countdown (audit F210).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromISODate } from '../plan/week';
import { splitStepTimers, weeklyStreak, type CookEvent } from './cook';
import { isFinished, startTimer } from './timers';

const at = (iso: string, hour = 18) => fromISODate(iso).getTime() + hour * 3600 * 1000;

describe('cook streak weeks', () => {
  it('start on Monday: Sunday and the next Monday are two weeks in a row', () => {
    const log: CookEvent[] = [
      { id: '1', recipeId: 'a', cookedAt: at('2026-09-20') }, // Sunday
      { id: '2', recipeId: 'b', cookedAt: at('2026-09-21') }, // Monday
    ];
    assert.equal(weeklyStreak(log, fromISODate('2026-09-23')), 2);
  });
  it('a late Sunday cook still counts for the week it ends', () => {
    const log: CookEvent[] = [{ id: '1', recipeId: 'a', cookedAt: at('2026-09-27', 23) }];
    assert.equal(weeklyStreak(log, new Date(at('2026-09-27', 23) + 60_000)), 1);
    assert.equal(weeklyStreak(log, fromISODate('2026-09-28')), 1);
  });
});

describe('step timers', () => {
  it('times up to four hours, and leaves anything longer as text', () => {
    assert.deepEqual(splitStepTimers('Simmer for 4 hours.')[1], { type: 'timer', label: '4 hours', seconds: 4 * 3600 });
    assert.deepEqual(splitStepTimers('Simmer for 5 hours, stirring now and then.'), [
      { type: 'text', text: 'Simmer for 5 hours, stirring now and then.' },
    ]);
  });
});

describe('a timer finishing', () => {
  const timer = startTimer('t', '10 minutes', 0, 600, 1_000_000);
  const end = 1_000_000 + 600_000;
  it('is not finished one second, or one millisecond, before the end', () => {
    assert.equal(isFinished(timer, end - 1000), false);
    assert.equal(isFinished(timer, end - 1), false);
  });
  it('is finished at the end and after it', () => {
    assert.equal(isFinished(timer, end), true);
    assert.equal(isFinished(timer, end + 5000), true);
  });
});
