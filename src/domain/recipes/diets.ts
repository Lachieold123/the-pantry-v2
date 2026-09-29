// Diets and the avoid list, worked out from what's actually in the
// ingredient list (via the ingredient database), never from a recipe's name.

import type { IngredientDef, IngredientGroup, IngredientIndex } from '../ingredients/database';
import { normaliseWords } from '../ingredients/database';
import type { IngredientLine } from '../ingredients/types';
import { allLines, type DietTag, type Recipe } from './types';

const MEAT: readonly IngredientGroup[] = ['meat', 'beef', 'pork', 'lamb', 'poultry'];
const SEAFOOD: readonly IngredientGroup[] = ['fish', 'shellfish'];
const ANIMAL_NOT_MEAT: readonly IngredientGroup[] = ['dairy', 'egg', 'animal-product'];

function groupsOf(lines: readonly IngredientLine[], byId: ReadonlyMap<string, IngredientDef>): Set<IngredientGroup> {
  const groups = new Set<IngredientGroup>();
  for (const line of lines) {
    if (line.optional || !line.ingredientId) continue;
    for (const g of byId.get(line.ingredientId)?.groups ?? []) groups.add(g);
  }
  return groups;
}

/**
 * Draft diet tags from the ingredients. Optional lines don't count (you can
 * leave them out). Lines with no database match make every tag impossible,
 * because we can't vouch for what we can't identify.
 */
export function deriveDiets(lines: readonly IngredientLine[], byId: ReadonlyMap<string, IngredientDef>): DietTag[] {
  if (lines.some((l) => !l.optional && !l.ingredientId && l.quantity !== undefined)) return [];
  const g = groupsOf(lines, byId);
  const has = (list: readonly IngredientGroup[]) => list.some((x) => g.has(x));
  const diets: DietTag[] = [];
  const meatFree = !has(MEAT);
  if (meatFree && !has(SEAFOOD)) diets.push('vegetarian');
  if (meatFree && !has(SEAFOOD) && !has(ANIMAL_NOT_MEAT)) diets.push('vegan');
  if (meatFree && has(SEAFOOD)) diets.push('pescatarian');
  if (!g.has('gluten')) diets.push('no-gluten');
  if (!g.has('dairy')) diets.push('no-dairy');
  return diets;
}

export type DietPreference = 'everything' | 'vegetarian' | 'vegan' | 'pescatarian';

export function fitsDietPreference(recipe: Pick<Recipe, 'diets'>, pref: DietPreference): boolean {
  switch (pref) {
    case 'everything':
      return true;
    case 'vegetarian':
      return recipe.diets.includes('vegetarian');
    case 'vegan':
      return recipe.diets.includes('vegan');
    case 'pescatarian':
      return recipe.diets.includes('vegetarian') || recipe.diets.includes('pescatarian');
  }
}

/** The fixed choices on the "Ingredients to avoid" screen, each covering a group of ingredients (D-006). */
export const AVOID_OPTIONS = {
  nuts: ['tree-nuts', 'peanuts'],
  shellfish: ['shellfish'],
  fish: ['fish'],
  pork: ['pork'],
  beef: ['beef'],
  lamb: ['lamb'],
  dairy: ['dairy'],
  eggs: ['egg'],
  gluten: ['gluten'],
  sesame: ['sesame'],
  soy: ['soy'],
  spicy: ['chilli'],
  alcohol: ['alcohol'],
} as const satisfies Record<string, readonly IngredientGroup[]>;
export type AvoidOption = keyof typeof AVOID_OPTIONS;

export type AvoidList = { options: AvoidOption[]; custom: string[] };

/**
 * True when the recipe contains something the cook asked to avoid.
 * Optional lines count too: we'd rather hide a dish than serve it with a caveat.
 * Custom entries ("coriander") match the ingredient database, then fall back to
 * whole words in the line's text, so an unrecognised word still protects.
 */
export function containsAvoided(recipe: Pick<Recipe, 'ingredientGroups'>, avoid: AvoidList, index: IngredientIndex): boolean {
  const lines = allLines(recipe);
  const groups = new Set<IngredientGroup>(avoid.options.flatMap((o) => AVOID_OPTIONS[o]));
  const customIds = new Set(avoid.custom.map((c) => index.match(c)).filter((id): id is string => id !== undefined));
  const customWords = avoid.custom.map((c) => normaliseWords(c)).filter((w) => w.length > 0);

  return lines.some((line) => {
    const def = line.ingredientId ? index.byId.get(line.ingredientId) : undefined;
    if (def?.groups.some((g) => groups.has(g))) return true;
    if (line.ingredientId && customIds.has(line.ingredientId)) return true;
    const words = normaliseWords(line.item);
    return customWords.some((cw) => cw.every((w) => words.includes(w)));
  });
}
