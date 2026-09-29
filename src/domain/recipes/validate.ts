// Checks a recipe is well-formed before it enters the app: the catalogue at
// build time, and user and imported recipes at save time. Bad data fails
// here, loudly, instead of deep inside a screen.

import { isRange } from '../ingredients/quantity';
import { UNITS } from '../ingredients/units';
import { CUISINES, DIET_TAGS, DIFFICULTIES, MEAL_TYPES, SEASONS, type Recipe } from './types';

export type RecipeProblem = { path: string; message: string };

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function checkMinutes(value: number, path: string, problems: RecipeProblem[]): void {
  if (!Number.isInteger(value) || value < 0 || value > 24 * 60 * 3)
    problems.push({ path, message: 'must be whole minutes between 0 and 3 days' });
}

export function validateRecipe(r: Recipe): RecipeProblem[] {
  const problems: RecipeProblem[] = [];
  const add = (path: string, message: string) => problems.push({ path, message });

  if (!ID_PATTERN.test(r.id)) add('id', 'must be lower-case words joined by hyphens');
  if (!r.title.trim()) add('title', 'is empty');
  if (r.title.length > 80) add('title', 'is longer than 80 characters');
  if (r.summary !== undefined && r.summary.length > 120) add('summary', 'is longer than 120 characters');
  if (!isOneOf(CUISINES, r.cuisine)) add('cuisine', `unknown cuisine "${String(r.cuisine)}"`);
  if (!isOneOf(DIFFICULTIES, r.difficulty)) add('difficulty', 'must be easy, medium or hard');
  if (r.mealTypes.length === 0) add('mealTypes', 'needs at least one meal type');
  r.mealTypes.forEach((m, i) => isOneOf(MEAL_TYPES, m) || add(`mealTypes[${i}]`, `unknown meal type "${m}"`));
  r.diets.forEach((d, i) => isOneOf(DIET_TAGS, d) || add(`diets[${i}]`, `unknown diet "${d}"`));
  r.seasons?.forEach((s, i) => isOneOf(SEASONS, s) || add(`seasons[${i}]`, `unknown season "${s}"`));
  if (r.diets.includes('vegan') && !r.diets.includes('vegetarian')) add('diets', 'vegan recipes must also be vegetarian');
  checkMinutes(r.prepMinutes, 'prepMinutes', problems);
  checkMinutes(r.cookMinutes, 'cookMinutes', problems);
  if (!Number.isInteger(r.servings) || r.servings < 1 || r.servings > 50) add('servings', 'must be a whole number from 1 to 50');

  const lines = r.ingredientGroups.flatMap((g) => g.items);
  if (lines.length === 0) add('ingredientGroups', 'has no ingredients');
  r.ingredientGroups.forEach((group, gi) => {
    if (group.items.length === 0) add(`ingredientGroups[${gi}]`, 'is an empty group');
    group.items.forEach((line, li) => {
      const path = `ingredientGroups[${gi}].items[${li}]`;
      if (!line.item.trim()) add(`${path}.item`, 'is empty');
      if (line.unit !== undefined && !(line.unit in UNITS)) add(`${path}.unit`, `unknown unit "${String(line.unit)}"`);
      if (line.unit !== undefined && line.quantity === undefined) add(path, 'has a unit but no quantity');
      if (line.quantity !== undefined) {
        const values = isRange(line.quantity) ? [line.quantity.min, line.quantity.max] : [line.quantity];
        if (values.some((v) => !Number.isFinite(v) || v <= 0)) add(`${path}.quantity`, 'must be greater than zero');
        if (isRange(line.quantity) && line.quantity.min >= line.quantity.max) add(`${path}.quantity`, 'range must go from low to high');
      }
    });
  });

  if (r.steps.length === 0) add('steps', 'has no steps');
  r.steps.forEach((s, i) => s.text.trim() || add(`steps[${i}]`, 'is empty'));
  return problems;
}
