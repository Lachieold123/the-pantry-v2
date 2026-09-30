import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addToCupboard, cupboardIds } from './match';

describe('cupboard', () => {
  it('adding is idempotent and keeps the original entry', () => {
    const one = addToCupboard([], ['garlic'], 'manual', 1);
    const two = addToCupboard(one, ['garlic', 'garlic', 'lemon'], 'shop', 2);
    assert.deepEqual([...cupboardIds(two)], ['garlic', 'lemon']);
    assert.equal(two[0]?.source, 'manual');
    assert.equal(addToCupboard(two, ['lemon'], 'shop', 3), two);
  });
});
