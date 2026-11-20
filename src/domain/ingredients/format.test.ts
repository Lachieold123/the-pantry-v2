import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLine, formatQuantity, scaleLine } from './format';
import { parseIngredientLine } from './parse';
import type { IngredientLine } from './types';

const parse = (raw: string) => parseIngredientLine(raw).line;
const scaled = (line: IngredientLine, ratio: number, system: 'metric' | 'imperial' = 'metric') =>
  formatLine(scaleLine(line, ratio), system);

describe('a second amount in a line scales with the first (F-1)', () => {
  it('scales the amount after a "+" in the item', () => {
    const line: IngredientLine = { quantity: 3, item: 'egg yolks + 1 whole egg', raw: '3 egg yolks + 1 whole egg' };
    assert.equal(scaled(line, 2), '6 egg yolks + 2 whole egg');
    const thyme: IngredientLine = { quantity: 2, unit: 'tbsp', item: 'chopped thyme + 1 tbsp rosemary', raw: '' };
    assert.equal(scaled(thyme, 2), '4 tbsp chopped thyme + 2 tbsp rosemary');
  });
  it('scales a measured amount in the prep', () => {
    const lemons: IngredientLine = { quantity: 2, item: 'lemons', prep: 'zest and 3 tbsp juice', raw: '' };
    assert.equal(scaled(lemons, 2), '4 lemons, zest and 6 tbsp juice');
    const oranges: IngredientLine = { quantity: 2, item: 'oranges', prep: 'zest and 100ml juice', raw: '' };
    assert.equal(scaled(oranges, 0.5), '1 orange, zest and 50ml juice');
  });
  it('leaves sizes and times in the prep alone', () => {
    const beef: IngredientLine = { quantity: 1, unit: 'kg', item: 'beef', prep: 'cut into 3 cm pieces', raw: '' };
    assert.equal(scaled(beef, 2), '2 kg beef, cut into 3 cm pieces');
    const rice: IngredientLine = { quantity: 1, unit: 'cup', item: 'rice', prep: 'soaked 20 minutes', raw: '' };
    assert.equal(scaled(rice, 2), '2 cups rice, soaked 20 minutes');
  });
  it('scales a conversion in the note of a measured line', () => {
    const stock: IngredientLine = { quantity: 2, unit: 'cup', item: 'stock', note: '500 ml', raw: '' };
    assert.equal(scaled(stock, 0.25), '½ cup stock (125 ml)');
  });
  it('scales a note that says "total" or offers an alternative amount', () => {
    const ribs: IngredientLine = { quantity: 2, item: 'racks pork ribs', note: 'about 1.5kg total', raw: '' };
    assert.equal(scaled(ribs, 2), '4 racks pork ribs (about 3kg total)');
    const chilli: IngredientLine = { quantity: 1, item: 'red chilli', note: 'or 1/2 tsp chilli flakes', raw: '' };
    assert.equal(scaled(chilli, 2), '2 red chillies (or 1 tsp chilli flakes)');
  });
  it('keeps a per-item size as it is', () => {
    const tin: IngredientLine = { quantity: 1, unit: 'tin', item: 'crushed tomatoes', note: '400g', raw: '' };
    assert.equal(scaled(tin, 2), '2 tins crushed tomatoes (400g)');
    const cod: IngredientLine = { quantity: 4, item: 'cod fillets', note: '180g each', raw: '' };
    assert.equal(scaled(cod, 0.5), '2 cod fillets (180g each)');
  });
  it('changes nothing at the recipe\'s own serves', () => {
    const stock: IngredientLine = { quantity: 2, unit: 'cup', item: 'stock', note: '500 ml', raw: '' };
    assert.equal(scaleLine(stock, 1), stock);
  });
});

describe('small amounts never print as nothing (F-2)', () => {
  it('prints the smallest spoon fraction instead of 0', () => {
    assert.equal(scaled(parse('1/4 tsp nutmeg'), 1 / 8), '⅛ tsp nutmeg');
    assert.equal(scaled(parse('1/8 tsp cayenne'), 1 / 4), '⅛ tsp cayenne');
    assert.equal(scaled(parse('1/4 cup mint leaves'), 1 / 8), '⅛ cup mint leaves');
  });
  it('turns a kilo or litre under one into grams or millilitres', () => {
    assert.equal(scaled(parse('1.5 kg potatoes'), 0.25), '375 g potatoes');
    assert.equal(scaled(parse('1 l stock'), 0.25), '250 ml stock');
    assert.equal(formatQuantity(0.4, 'kg', 'metric'), '400 g');
  });
  it('prints eighths as fractions: ⅜, ⅝, ⅞', () => {
    assert.equal(formatQuantity(0.375, 'cup', 'metric'), '⅜ cup');
    assert.equal(formatQuantity(2.625, 'tsp', 'metric'), '2⅝ tsp');
    assert.equal(formatQuantity(0.875, 'cup', 'metric'), '⅞ cup');
  });
  it('still reads whole and common amounts as before', () => {
    assert.equal(formatQuantity(1.5, 'kg', 'metric'), '1½ kg');
    assert.equal(formatQuantity(1 / 3, 'cup', 'metric'), '⅓ cup');
  });
});
