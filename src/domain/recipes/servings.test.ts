import assert from 'node:assert/strict';
import { it } from 'node:test';

import { clampServings, MAX_SERVINGS } from './servings';

it('keeps a link\'s serves between 1 and the stepper\'s 24 (F-11)', () => {
  assert.equal(clampServings(6), 6);
  assert.equal(clampServings(1e9), MAX_SERVINGS);
  assert.equal(clampServings(0.5), 1);
  assert.equal(clampServings(2.6), 3);
  assert.equal(clampServings(0), undefined);
  assert.equal(clampServings(-3), undefined);
  assert.equal(clampServings(Number.NaN), undefined);
  assert.equal(clampServings(undefined), undefined);
});
