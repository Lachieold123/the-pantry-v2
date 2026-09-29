import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildIngredientIndex } from './database';
import { formatLine, formatQuantity, scaleLine } from './format';
import { parseIngredientLine } from './parse';
import { addQuantities, formatKitchenNumber, formatMeasuredNumber, parseNumber } from './quantity';
import { areConvertible, convert } from './units';

const index = buildIngredientIndex([
  { id: 'garlic', name: 'garlic', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'brown-onion', name: 'brown onion', aisle: 'fruit-veg', aliases: ['onion'], groups: [] },
  { id: 'potato', name: 'potato', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'sweet-potato', name: 'sweet potato', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'crushed-tomatoes', name: 'crushed tomatoes', aisle: 'tins-jars', aliases: ['tinned tomatoes'], groups: [] },
  { id: 'lemon', name: 'lemon', aisle: 'fruit-veg', aliases: [], groups: [] },
  { id: 'salt', name: 'salt', aisle: 'herbs-spices', aliases: [], groups: [], staple: true },
]);
const parse = (raw: string) => parseIngredientLine(raw, index.match);

describe('parseNumber', () => {
  it('reads whole numbers, decimals, fractions and unicode fractions', () => {
    assert.equal(parseNumber('2'), 2);
    assert.equal(parseNumber('1.5'), 1.5);
    assert.equal(parseNumber('1,5'), 1.5);
    assert.equal(parseNumber('1/2'), 0.5);
    assert.equal(parseNumber('1 1/2'), 1.5);
    assert.equal(parseNumber('½'), 0.5);
    assert.equal(parseNumber('1½'), 1.5);
  });
  it('rejects nonsense and division by zero', () => {
    assert.equal(parseNumber('abc'), undefined);
    assert.equal(parseNumber('1/0'), undefined);
    assert.equal(parseNumber(''), undefined);
  });
});

describe('parseIngredientLine', () => {
  it('splits quantity, glued unit, item and prep', () => {
    const { line, issues } = parse('500g beef mince, browned');
    assert.equal(line.quantity, 500);
    assert.equal(line.unit, 'g');
    assert.equal(line.item, 'beef mince');
    assert.equal(line.prep, 'browned');
    assert.deepEqual(issues, ['no-ingredient-match']);
  });
  it('moves a trailing count word into the unit', () => {
    const { line } = parse('3 garlic cloves, minced');
    assert.deepEqual([line.quantity, line.unit, line.item, line.ingredientId], [3, 'clove', 'garlic', 'garlic']);
  });
  it('keeps a bare "4 cloves" as the item (the spice), not a unit', () => {
    const { line } = parse('4 cloves');
    assert.equal(line.unit, undefined);
    assert.equal(line.item, 'cloves');
  });
  it('reads ranges with hyphens, en dashes and "to"', () => {
    assert.deepEqual(parse('2-3 tbsp oil').line.quantity, { min: 2, max: 3 });
    assert.deepEqual(parse('2–3 tbsp oil').line.quantity, { min: 2, max: 3 });
    assert.deepEqual(parse('2 to 3 tbsp oil').line.quantity, { min: 2, max: 3 });
  });
  it('turns packaging into a note: "400g tin crushed tomatoes"', () => {
    const { line } = parse('400g tin crushed tomatoes');
    assert.equal(line.item, 'crushed tomatoes');
    assert.equal(line.note, 'tin');
    assert.equal(line.ingredientId, 'crushed-tomatoes');
  });
  it('reads measure phrases like "Pinch of salt" and "Small bunch parsley"', () => {
    assert.deepEqual([parse('Pinch of salt').line.unit, parse('Pinch of salt').line.item], ['pinch', 'salt']);
    const bunch = parse('Small bunch parsley').line;
    assert.deepEqual([bunch.quantity, bunch.unit, bunch.item, bunch.note], [1, 'bunch', 'parsley', 'small bunch']);
  });
  it('reads "Juice of 1 lemon" as a lemon, juiced', () => {
    const { line } = parse('Juice of 1 lemon');
    assert.deepEqual([line.quantity, line.item, line.prep, line.ingredientId], [1, 'lemon', 'juiced', 'lemon']);
  });
  it('keeps notes and optional flags out of the item', () => {
    const { line } = parse('150g pancetta (or bacon), chopped (optional)');
    assert.equal(line.item, 'pancetta');
    assert.equal(line.note, 'or bacon');
    assert.equal(line.optional, true);
  });
  it('flags lines with no quantity, and serving suggestions separately', () => {
    assert.ok(parse('Salt').issues.includes('no-quantity'));
    assert.ok(parse('Lemon wedges, to serve').issues.includes('serving-suggestion'));
  });
  it('flags "A or B" items for review', () => {
    assert.ok(parse('Basmati rice or naan').issues.includes('multiple-ingredients'));
  });
  it('always keeps the original text', () => {
    assert.equal(parse('  2 eggs ').line.raw, '  2 eggs ');
  });
});

describe('ingredient index', () => {
  it('prefers the longest phrase', () => {
    assert.equal(index.match('2 small sweet potatoes'), 'sweet-potato');
    assert.equal(index.match('potatoes'), 'potato');
  });
  it('matches whole words only', () => {
    assert.equal(index.match('saltine crackers'), undefined);
  });
  it('rejects duplicate ids', () => {
    const def = { id: 'x', name: 'x', aisle: 'other' as const, aliases: [], groups: [] };
    assert.throws(() => buildIngredientIndex([def, def]));
  });
});

describe('units', () => {
  it('uses Australian measures', () => {
    assert.equal(convert(1, 'tbsp', 'tsp'), 4);
    assert.equal(convert(1, 'cup', 'ml'), 250);
  });
  it('knows which units can be added together', () => {
    assert.ok(areConvertible('g', 'kg'));
    assert.ok(areConvertible('tsp', 'cup'));
    assert.ok(!areConvertible('g', 'ml'));
    assert.ok(!areConvertible('clove', 'g'));
    assert.ok(!areConvertible(undefined, 'g'));
  });
});

describe('formatting', () => {
  it('snaps to kitchen fractions', () => {
    assert.equal(formatKitchenNumber(1 / 3), '⅓');
    assert.equal(formatKitchenNumber(1.5), '1½');
    assert.equal(formatKitchenNumber(2), '2');
    assert.equal(formatKitchenNumber(0.99), '1');
  });
  it('rounds weights to sensible steps', () => {
    assert.equal(formatMeasuredNumber(437), '435');
    assert.equal(formatMeasuredNumber(33.3), '33');
    assert.equal(formatMeasuredNumber(1234), '1230');
  });
  it('scales 4 → 1 → 12 servings sensibly', () => {
    const cup = parse('1 cup stock').line;
    assert.equal(formatQuantity(scaleLine(cup, 1 / 3).quantity ?? 0, 'cup', 'metric'), '⅓ cup');
    const mince = parse('500g beef mince').line;
    assert.equal(formatLine(scaleLine(mince, 1 / 4), 'metric'), '125 g beef mince');
    assert.equal(formatLine(scaleLine(mince, 3), 'metric'), '1½ kg beef mince');
  });
  it('rounds counted things up to the nearest half', () => {
    const onion = parse('1 onion, diced').line;
    assert.equal(formatLine(scaleLine(onion, 1 / 4), 'metric'), '½ onion, diced');
    const garlic = parse('3 garlic cloves').line;
    assert.equal(formatLine(scaleLine(garlic, 1 / 4), 'metric'), '1 clove garlic');
  });
  it('converts to imperial and back without drift', () => {
    const mince = parse('500g beef mince').line;
    assert.equal(formatQuantity(mince.quantity ?? 0, 'g', 'imperial'), '1.1 lb');
    assert.equal(formatQuantity(250, 'g', 'imperial'), '8.8 oz');
    assert.equal(formatQuantity(mince.quantity ?? 0, 'g', 'metric'), '500 g');
    assert.equal(formatQuantity(2, 'tbsp', 'imperial'), '2 tbsp');
  });
  it('puts leaves after the item: "2 bay leaves"', () => {
    assert.equal(formatLine(parse('2 bay leaves').line, 'metric'), '2 bay leaves');
    assert.equal(formatLine(parse('1 bay leaf').line, 'metric'), '1 bay leaf');
  });
  it('prints ranges', () => {
    assert.equal(formatQuantity({ min: 2, max: 3 }, 'clove', 'metric'), '2–3 cloves');
  });
  it('adds quantities, including ranges', () => {
    assert.equal(addQuantities(1, 2), 3);
    assert.deepEqual(addQuantities(1, { min: 2, max: 3 }), { min: 3, max: 4 });
  });
});

describe('counted items agree with their number after scaling (K-2)', () => {
  const line = (raw: string) => parseIngredientLine(raw, index.match).line;
  const scaled = (raw: string, ratio: number) => formatLine(scaleLine(line(raw), ratio), 'metric');
  it('goes singular when scaled down to one', () => {
    assert.equal(scaled('3 large onions', 1 / 3), '1 large onion');
    assert.equal(scaled('4 tomatoes, diced', 0.25), '1 tomato, diced');
    assert.equal(scaled('2 chillies', 0.5), '1 chilli');
    assert.equal(scaled('2 chicken breasts', 0.5), '1 chicken breast');
  });
  it('goes plural when scaled up from one', () => {
    assert.equal(scaled('1 lemon, juiced', 2), '2 lemons, juiced');
    assert.equal(scaled('1 sweet potato', 3), '3 sweet potatoes');
    assert.equal(scaled('1 bok choy', 2), '2 bok choy');
  });
  it('leaves the wording alone when the number stays on the same side of one', () => {
    assert.equal(scaled('2 bok choy', 2), '4 bok choy');
    assert.equal(scaled('3 eggs', 2), '6 eggs');
  });
});
