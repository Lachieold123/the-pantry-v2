import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { leaveWarning, startTimer, timerForChip } from './timers';

describe('two equal times in one step (BUG-11)', () => {
  it('are two timers, each found by its own chip', () => {
    const first = startTimer('a', '3 minutes', 1, 180, 0, 0);
    const timers = [first];
    assert.equal(timerForChip(timers, 1, 0), first);
    assert.equal(timerForChip(timers, 1, 2), undefined);
  });
});

describe('leaving Cook Mode with timers running (F-6)', () => {
  const a = startTimer('a', '40 minutes', 2, 2400, 0);
  const b = startTimer('b', '5 minutes', 3, 300, 0);
  it('says nothing when no timer is still counting down', () => {
    assert.equal(leaveWarning([], 0), undefined);
    assert.equal(leaveWarning([b], 300_000), undefined);
  });
  it('says how long is left on one timer', () => {
    assert.equal(leaveWarning([a, b], 120_000), '2 timers are still running. Leaving stops them.');
    assert.equal(leaveWarning([a], 120_000), '38:00 left on your timer. Leaving stops it.');
  });
});
