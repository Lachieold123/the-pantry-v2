import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startTimer, timerForChip } from './timers';

describe('two equal times in one step (BUG-11)', () => {
  it('are two timers, each found by its own chip', () => {
    const first = startTimer('a', '3 minutes', 1, 180, 0, 0);
    const timers = [first];
    assert.equal(timerForChip(timers, 1, 0), first);
    assert.equal(timerForChip(timers, 1, 2), undefined);
  });
});
