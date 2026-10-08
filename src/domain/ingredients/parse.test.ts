// Parser slips found in the 8 October audit, each failing before its fix.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { parseIngredientLine } from './parse';
import { parseNumber } from './quantity';

const parse = (raw: string) => parseIngredientLine(raw, index.match);

describe('numbers with commas (BUG-15)', () => {
  it('reads "1,000 g flour" as a thousand grams, and "1,5 kg" as one and a half', () => {
    assert.equal(parse('1,000 g flour').line.quantity, 1000);
    assert.equal(parse('1,000 g flour').line.unit, 'g');
    assert.equal(parse('1,5 kg potatoes').line.quantity, 1.5);
    assert.equal(parseNumber('2,500'), 2500);
  });
});

describe('"1 x 400g tin" (BUG-20)', () => {
  it('multiplies the count by the size and drops the tin', () => {
    const { line } = parse('1 x 400g tin chopped tomatoes');
    assert.equal(line.quantity, 400);
    assert.equal(line.unit, 'g');
    assert.equal(line.item, 'chopped tomatoes');
    assert.equal(parse('2 x 400g tins chickpeas').line.quantity, 800);
  });
});

describe('lines that are only an amount, or a backwards range (BUG-26)', () => {
  it('reads "500 g" and "2 cups" as a measure with no ingredient, not an ingredient called "g"', () => {
    assert.equal(parse('500 g').line.item, '');
    assert.equal(parse('2 cups').line.unit, 'cup');
  });
  it('keeps "4 cloves" as the spice', () => {
    assert.equal(parse('4 cloves').line.item, 'cloves');
  });
  it('flags "3-2 eggs"', () => {
    assert.ok(parse('3-2 eggs').issues.includes('no-quantity'));
  });
});
