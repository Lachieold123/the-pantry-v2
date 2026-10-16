import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { estimateKcalPerServe, kcalPer100, lineGrams } from './nutrition-estimate.mts';

const line = (quantity: number, unit: IngredientLine['unit'], ingredientId: string): IngredientLine => ({
  quantity,
  unit,
  ingredientId,
  item: ingredientId,
  raw: `${quantity} ${unit ?? ''} ${ingredientId}`,
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
});
