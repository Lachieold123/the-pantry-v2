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
  it('never print "1000 ml" or "1000 g": an amount that rounds to 1000 is already 1 L or 1 kg', () => {
    assert.equal(formatQuantity(999, 'ml', 'metric'), '1 L');
    assert.equal(formatQuantity(998, 'g', 'metric'), '1 kg');
    assert.equal(formatQuantity(997, 'ml', 'metric'), '995 ml');
  });
});

describe('imperial liquids', () => {
  it('stay in millilitres up to 60 ml, then turn into fl oz', () => {
    assert.equal(formatQuantity(60, 'ml', 'imperial'), '60 ml');
    assert.equal(formatQuantity(90, 'ml', 'imperial'), '3 fl oz');
    assert.equal(formatQuantity(250, 'ml', 'imperial'), '8½ fl oz');
  });
});
