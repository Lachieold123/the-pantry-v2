// Written amounts people actually type or paste, and how they print once
// scaled or shown in imperial. Each case is a bug the 2026-09-30 audit found.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildIngredientIndex } from './database';
import { formatLine, formatQuantity, scaleLine, type UnitSystem } from './format';
import { parseIngredientLine } from './parse';
import { formatKitchenNumber, parseNumber } from './quantity';

const index = buildIngredientIndex([
  { id: 'flour', name: 'flour', aisle: 'other', aliases: [], groups: [] },
  { id: 'milk', name: 'milk', aisle: 'dairy-eggs', aliases: [], groups: [] },
  { id: 'lemon', name: 'lemon', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'olive-oil', name: 'olive oil', aisle: 'other', aliases: [], groups: [] },
  { id: 'basil', name: 'basil', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'cabbage', name: 'cabbage', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'egg', name: 'egg', aisle: 'dairy-eggs', aliases: ['eggs'], groups: [] },
  { id: 'ramen-noodles', name: 'ramen noodles', aisle: 'other', aliases: [], groups: [] },
]);
const line = (raw: string) => parseIngredientLine(raw, index.match).line;
const shown = (raw: string, ratio = 1, system: UnitSystem = 'metric') => formatLine(scaleLine(line(raw), ratio), system);

describe('reading written amounts (F38)', () => {
  it('reads thousands separators, spaced unicode fractions and hyphenated mixed numbers', () => {
    assert.equal(parseNumber('1,000'), 1000);
    assert.equal(line('1,000 g flour').quantity, 1000);
    assert.equal(line('1 ½ cups milk').quantity, 1.5);
    assert.equal(line('1-1/2 cups milk').quantity, 1.5);
    assert.equal(parseNumber('1,5'), 1.5);
  });
  it('drops a second amount that would never scale, and says so', () => {
    for (const raw of ['300 g/10 oz flour', '300 g (10 oz) flour']) {
      const { line: l, issues } = parseIngredientLine(raw, index.match);
      assert.deepEqual([l.quantity, l.unit, l.item, l.note], [300, 'g', 'flour', undefined], raw);
      assert.ok(issues.includes('second-amount'), raw);
    }
    // A tin's weight isn't a second amount of tins.
    assert.equal(line('1 tin (400g) tomatoes').note, '400g');
  });
});

describe('phrases (F44, F192, F193, F195)', () => {
  it('gives a drizzle no amount to scale or shop for', () => {
    const l = line('Drizzle of olive oil');
    assert.deepEqual([l.quantity, l.item, l.prep], [undefined, 'olive oil', 'to drizzle']);
    assert.equal(shown('Drizzle of olive oil', 2), 'olive oil, to drizzle');
  });
  it('reads "half a lemon" without keeping the article', () => {
    assert.deepEqual([line('Juice of half a lemon').quantity, line('Juice of half a lemon').item], [0.5, 'lemon']);
    assert.equal(shown('Juice of half a lemon', 2), '1 lemon, juiced');
    assert.equal(line('half an onion').quantity, 0.5);
  });
  it('doesn’t repeat the measure as a note', () => {
    assert.equal(shown('Small handful of basil', 2), '2 handfuls basil (small)');
  });
  it('recognises optional lines however they’re written', () => {
    assert.deepEqual([line('Pâté (optional, traditional)').optional, line('Pâté (optional, traditional)').note], [true, 'traditional']);
    assert.equal(line('2 tbsp raisins (optional but traditional)').note, 'traditional');
    assert.ok(line('400g spaghetti (optional traditional)').optional);
    const fillings = line('Optional fillings: grated Gruyère, chopped chives');
    assert.deepEqual([fillings.optional, fillings.item], [true, 'grated Gruyère']);
  });
  it('inflects the counting word, not the last one', () => {
    assert.equal(shown('2 portions fresh ramen noodles', 0.5), '1 portion fresh ramen noodles');
    assert.equal(shown('1 square dark chocolate', 2), '2 squares dark chocolate');
  });
});

describe('printing scaled amounts (F40, F41, F42)', () => {
  it('prints spoons in eighths, never as decimals or "0"', () => {
    assert.equal(formatKitchenNumber(0.4, 'spoons'), '⅜');
    assert.equal(shown('1 tsp turmeric', 0.4), '⅜ tsp turmeric');
    assert.equal(shown('1/4 tsp nutmeg', 1 / 4), 'a pinch of nutmeg');
    assert.equal(formatQuantity(0.01, 'tsp', 'metric'), 'a pinch');
  });
  it('steps small spoons and cups down a size', () => {
    assert.equal(shown('1 tbsp oil', 1 / 4), '1 tsp oil');
    assert.equal(shown('1/4 cup oil', 1 / 4), '¾ tbsp oil');
  });
  it('shows kg and L below one in g and ml', () => {
    assert.equal(shown('1 kg chicken', 1 / 8), '125 g chicken');
    assert.equal(shown('1.5 L stock', 1 / 2), '750 ml stock');
  });
  it('never prints "0 oz"', () => {
    assert.equal(shown('5 g salt', 1 / 4, 'imperial'), '1.3 g salt');
  });
  it('leaves the recipe’s own fraction alone at its own servings, and rounds scaled counts up to halves', () => {
    assert.equal(shown('1/4 cabbage'), '¼ cabbage');
    assert.equal(shown('3 eggs', 1 / 4), '1 egg');
    assert.equal(shown('1 egg', 1 / 4), '½ egg');
  });
});

describe('imperial liquids and weights (F180)', () => {
  it('rounds fl oz above 10 to whole numbers and switches to quarts at 32 fl oz', () => {
    assert.equal(shown('150 ml wine', 1, 'imperial'), '5 fl oz wine');
    assert.equal(shown('500 ml stock', 1, 'imperial'), '17 fl oz stock');
    assert.equal(shown('1 L stock', 1, 'imperial'), '1 qt stock');
    assert.equal(shown('2 L stock', 1, 'imperial'), '2 qt stock');
  });
  it('snaps pounds to quarters', () => {
    assert.equal(shown('1.5 kg lamb', 1, 'imperial'), '3¼ lb lamb');
  });
});
