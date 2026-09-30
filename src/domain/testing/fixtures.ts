// Shared test fixtures: the real ingredient database and catalogue, plus a
// tiny recipe builder for exact, readable cases.

import { readFileSync } from 'node:fs';

import { buildIngredientIndex, type IngredientDef } from '../ingredients/database';
import { parseIngredientLine } from '../ingredients/parse';
import type { Recipe } from '../recipes/types';
import { buildKitchen, type KitchenData } from '../cupboard/kitchen';

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;

export const ingredientDefs = read<IngredientDef[]>('../../data/ingredients/ingredients.json');
export const index = buildIngredientIndex(ingredientDefs);
export const catalogue = read<Recipe[]>('../../data/catalogue/recipes.json');
export const kitchenData = read<KitchenData>('../../data/ingredients/kitchen.json');
export const kitchen = buildKitchen(index, kitchenData);

/** A minimal valid recipe from plain ingredient lines. */
export function makeRecipe(id: string, lines: string[], overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title: id,
    cuisine: 'modern-australian',
    diets: [],
    mealTypes: ['dinner'],
    difficulty: 'easy',
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    onePot: false,
    ingredientGroups: [{ items: lines.map((l) => parseIngredientLine(l, index.match).line) }],
    steps: [{ text: 'Cook it.' }],
    source: 'house',
    ...overrides,
  };
}
