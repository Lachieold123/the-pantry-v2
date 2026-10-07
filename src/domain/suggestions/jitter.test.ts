import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { stableJitter } from './jitter';

describe('stableJitter', () => {
  it('is between 0 and 1 and repeatable', () => {
    const a = stableJitter('s', 'x');
    assert.ok(a >= 0 && a <= 1);
    assert.equal(a, stableJitter('s', 'x'));
  });

  it('changes with the seed', () => {
    assert.notEqual(stableJitter('2026-09-29', 'x'), stableJitter('2026-09-30', 'x'));
  });
});
