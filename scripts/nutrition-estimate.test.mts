import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { estimateKcalPerServe, estimateMacrosPerServe, kcalPer100, lineGrams, lineKcal } from './nutrition-estimate.mts';

const line = (quantity: number, unit: IngredientLine['unit'] | undefined, ingredientId: string, raw?: string): IngredientLine => ({
  quantity,
  ...(unit ? { unit } : {}),
  ingredientId,
  item: ingredientId,
  raw: raw ?? `${quantity} ${unit ?? ''} ${ingredientId}`,
});
const noAisle = () => undefined;

describe('nutrition estimate', () => {
  it('reads coconut milk and cream as coconut, not as nuts', () => {
    assert.equal(kcalPer100('coconut-milk'), 190);
    assert.equal(kcalPer100('coconut-cream'), 330);
    assert.equal(kcalPer100('almonds'), 590);
  });

  it('weighs a cup of dry rice at about 200 g, not 250 g', () => {
    assert.equal(lineGrams(line(1, 'cup', 'jasmine-rice')), 200);
  });

  it('counts a spring onion, a shallot and a tin of tuna at their real size', () => {
    assert.equal(lineGrams(line(1, undefined, 'spring-onion')), 15);
    assert.equal(lineGrams(line(1, undefined, 'shallot')), 30);
    assert.equal(lineGrams(line(1, 'tin', 'tinned-tuna')), 185);
    assert.equal(lineGrams(line(1, 'tin', 'tinned-tomatoes')), 400);
  });

  it('puts a coconut rice dish within about 15% of a hand count', () => {
    // 600 g white fish, 250 ml coconut milk, 2 cups jasmine rice, 1 tbsp oil, 3 spring onions, serves 4.
    // By hand (USDA/AUSNUT): about 540 + 490 + 1420 + 124 + 14 = 2590 kcal, so about 650 a serve.
    // The old table said 1071.
    const lines = [
      line(600, 'g', 'white-fish'),
      line(1, 'cup', 'coconut-milk'),
      line(2, 'cup', 'jasmine-rice'),
      line(1, 'tbsp', 'neutral-oil'),
      line(3, undefined, 'spring-onion'),
    ];
    const est = estimateKcalPerServe(lines, 4, noAisle);
    assert.ok(Math.abs(est.kcal - 650) / 650 < 0.15, `got ${Math.round(est.kcal)}`);
    assert.equal(est.cover, 1);
  });

  it('divides by servings and skips optional lines', () => {
    const lines = [line(100, 'g', 'white-rice'), { ...line(100, 'g', 'butter'), optional: true }];
    assert.equal(estimateKcalPerServe(lines, 1, noAisle).kcal, 355);
    assert.equal(estimateKcalPerServe(lines, 5, noAisle).kcal, 71);
  });

  it('counts cooked rice at cooked weight and energy, not dry', () => {
    // 2 cups cooked jasmine rice is about 320 g and 450 kcal; the dry figures gave 1420.
    const k = lineKcal(line(2, 'cup', 'jasmine-rice', '2 cups cooked jasmine rice'), noAisle) ?? 0;
    assert.ok(k > 380 && k < 520, `got ${Math.round(k)}`);
    assert.equal(lineKcal(line(300, 'g', 'white-rice', '300g cooked rice'), noAisle), 420);
  });

  it('counts only the oil a deep-fried dish soaks up, but all of the oil in a sauce', () => {
    const fry = lineKcal(line(2, 'cup', 'neutral-oil', '2 cups neutral oil, for frying'), noAisle) ?? 0;
    assert.ok(fry > 500 && fry < 700, `got ${Math.round(fry)}`); // about 70 g absorbed, not 460 g
    const bath = [line(500, 'ml', 'neutral-oil')];
    const deepFry = estimateKcalPerServe(bath, 1, noAisle, ['Heat the oil to 180°C and fry until golden.']).kcal;
    assert.ok(deepFry < 700, `got ${Math.round(deepFry)}`);
    const pesto = estimateKcalPerServe([line(0.5, 'cup', 'olive-oil')], 1, noAisle, ['Blend until smooth.']).kcal;
    assert.ok(pesto > 950, `got ${Math.round(pesto)}`);
    assert.equal(Math.round(lineKcal(line(1, 'tbsp', 'olive-oil'), noAisle) ?? 0), 121);
  });

  it('counts dried split pulses as dry even when linked to the tinned ingredient', () => {
    assert.equal(lineKcal(line(200, 'g', 'chickpeas', '200g split chickpeas (chana dal), soaked'), noAisle), 680);
    assert.equal(lineKcal(line(240, 'g', 'chickpeas', '240g tinned chickpeas, drained'), noAisle), 264);
    // Whole-tin weights are counted drained: 800 g of tins is 480 g of chickpeas.
    assert.equal(lineKcal(line(800, 'g', 'chickpeas', '800g tinned chickpeas, drained'), noAisle), 528);
    assert.equal(lineKcal(line(400, 'g', 'black-beans', '400g can black beans, drained'), noAisle), lineKcal(line(240, 'g', 'black-beans', '240g black beans'), noAisle));
  });

  it('reads "2 x 400g tins" as two tins, drained for pulses', () => {
    assert.equal(lineGrams({ ...line(2, undefined, 'chickpeas', '2 x 400g tinned chickpeas, drained') }), 480);
    assert.equal(lineGrams({ ...line(2, undefined, 'tinned-tomatoes', '2 x 400 g tins tomatoes') }), 800);
  });

  it('weighs wrappers, corn tortillas, anchovy fillets and sun-dried tomatoes at their real size', () => {
    assert.equal(lineGrams(line(24, undefined, 'gyoza-wrappers')), 192);
    assert.equal(lineGrams(line(20, undefined, 'spring-roll-wrappers')), 260);
    assert.equal(lineGrams(line(4, undefined, 'corn-tortilla')), 112);
    assert.equal(lineGrams(line(6, 'fillet', 'anchovy')), 24);
    assert.equal(lineGrams(line(6, undefined, 'sun-dried-tomato')), 42);
    assert.equal(lineGrams(line(2, 'sheet', 'puff-pastry')), 340);
    assert.equal(lineGrams(line(1, undefined, 'butter-puff-pastry')), 170);
    assert.equal(lineGrams(line(4, 'sheet', 'filo-pastry')), 80);
  });

  it('gives water no energy and counts shell-on clams and soup bones lightly', () => {
    assert.equal(kcalPer100('water'), 0);
    assert.equal(kcalPer100('clams'), 30);
    assert.equal(kcalPer100('beef-bones'), 25);
    assert.equal(kcalPer100('cottage-cheese'), 100);
    assert.equal(kcalPer100('daikon'), 20);
  });

  it('counts bone-in chicken as bought, without taking the bone off twice', () => {
    assert.equal(lineGrams(line(8, undefined, 'chicken-drumstick')), 1080);
    assert.equal(lineGrams(line(1, undefined, 'whole-chicken')), 1500);
    assert.equal(kcalPer100('chicken-drumstick'), 115);
    const pieces = line(800, 'g', 'chicken-pieces', '800g chicken pieces, bone-in');
    assert.equal(lineKcal(pieces, noAisle), 920);
  });

  it('reads sausages, ham, olives, tinned tomatoes, silken tofu and gnocchi at their own figures', () => {
    assert.equal(kcalPer100('bratwurst'), 290);
    assert.equal(kcalPer100('chorizo'), 430);
    assert.equal(kcalPer100('ham'), 125);
    assert.equal(kcalPer100('kalamata-olive'), 145);
    assert.equal(kcalPer100('tinned-tomatoes'), 22);
    assert.equal(kcalPer100('tomato-paste'), 80);
    assert.equal(kcalPer100('silken-tofu'), 55);
    assert.equal(kcalPer100('fresh-pasta-gnocchi'), 160);
  });

  it('weighs roti, a bacon slice, a rice paper sheet and cooked lentils at their real size', () => {
    assert.equal(lineGrams(line(4, undefined, 'roti')), 180);
    assert.equal(lineGrams(line(4, 'slice', 'bacon')), 100);
    assert.equal(lineGrams(line(8, 'sheet', 'rice-paper')), 72);
    assert.equal(lineKcal(line(1, 'cup', 'brown-lentils', '1 cup cooked brown lentils'), noAisle), 240);
  });

  it('splits energy into macros by food type', () => {
    // 100 g bacon and 480 g drained cannellini beans, serves 1.
    const m = estimateMacrosPerServe([line(100, 'g', 'bacon'), line(480, 'g', 'cannellini-beans')], 1, noAisle);
    assert.ok(m.proteinG > 50 && m.proteinG < 60, `${m.proteinG}`);
    const oil = estimateMacrosPerServe([line(1, 'tbsp', 'olive-oil')], 1, noAisle);
    assert.equal(oil.proteinG, 0);
    assert.ok(oil.fatG > 13 && oil.fatG < 14);
  });
});
