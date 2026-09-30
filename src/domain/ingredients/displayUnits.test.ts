// Where a printed unit changes: millilitres to litres, and millilitres to
// fluid ounces for imperial cooks (audit F210).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatQuantity } from './format';

describe('metric liquids', () => {
  it('step up to litres at 1000 ml', () => {
    assert.equal(formatQuantity(1000, 'ml', 'metric'), '1 L');
    assert.equal(formatQuantity(1500, 'ml', 'metric'), '1½ L');
    assert.equal(formatQuantity(750, 'ml', 'metric'), '750 ml');
  });
});

describe('imperial liquids', () => {
  it('stay in millilitres up to 60 ml, then turn into fl oz', () => {
    assert.equal(formatQuantity(60, 'ml', 'imperial'), '60 ml');
    assert.equal(formatQuantity(90, 'ml', 'imperial'), '3 fl oz');
    assert.equal(formatQuantity(250, 'ml', 'imperial'), '8½ fl oz');
  });
});
