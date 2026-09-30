import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clampServings, MAX_SERVINGS, parseServings } from './servings';

describe('servings from a route param', () => {
  it('reads a whole number', () => {
    assert.equal(parseServings('8'), 8);
    assert.equal(parseServings(['6', '2']), 6);
  });

  it('clamps to 1–50', () => {
    assert.equal(parseServings('0'), 1);
    assert.equal(parseServings('-3'), 1);
    assert.equal(parseServings('500'), MAX_SERVINGS);
  });

  it('ignores anything that is not a whole number', () => {
    for (const bad of ['Infinity', 'NaN', '2.5', '1e3', '', 'four', undefined]) {
      assert.equal(parseServings(bad), undefined, String(bad));
    }
  });

  it('clamps and rounds a number', () => {
    assert.equal(clampServings(51), 50);
    assert.equal(clampServings(2.4), 2);
  });
});
