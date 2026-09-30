// "Tonight, for you": a short, personal list of dinners. Used by the
// onboarding reveal and by Today when nothing is planned.
//
// Diet, avoid list and hidden dishes are hard rules (same as Surprise me).
// Favourite cuisines and weeknight time only reorder, so picky answers
// still get a suggestion rather than an empty screen. The order is stable
// for a given seed (today's date), so Today doesn't reshuffle on every visit.

import type { IngredientIndex } from '../ingredients/database';
import type { AvoidList, DietPreference } from '../recipes/diets';
import { NO_FILTERS, type TimeFilter } from '../recipes/search';
import { totalMinutes, type CuisineId, type MealType, type Recipe } from '../recipes/types';
import { eligibleForSurprise } from './surprise';

export type Taste = { diet: DietPreference; avoid: AvoidList; cuisines: readonly CuisineId[]; weeknight: TimeFilter | undefined };

export type ForYouInput = {
  recipes: readonly Recipe[];
  taste: Taste;
  hidden: ReadonlySet<string>;
  planned: ReadonlySet<string>;
  recentlyCooked: readonly string[];
  index: IngredientIndex;
  seed: string;
  count: number;
  /** Which meal to suggest for; dinner unless a screen is planning another. */
  mealType?: MealType;
};

/** A cheap, stable 0–1 number per recipe and seed (FNV-1a), so ties break the same way all day. */
export function stableJitter(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0xffffffff;
}

const LIMITS: Readonly<Record<TimeFilter, number>> = {
  'under-15': 15,
  'under-30': 30,
  'under-45': 45,
  'under-60': 60,
  'over-60': Infinity,
};

export function forYou(input: ForYouInput): Recipe[] {
  const { taste } = input;
  const pool = eligibleForSurprise({
    recipes: input.recipes,
    filters: { ...NO_FILTERS, mealTypes: [input.mealType ?? 'dinner'] },
    diet: taste.diet,
    avoid: taste.avoid,
    hidden: input.hidden,
    index: input.index,
  });
  const recent = new Set(input.recentlyCooked.slice(0, 14));
  const loved = new Set(taste.cuisines);
  const limit = taste.weeknight ? LIMITS[taste.weeknight] : Infinity;
  return pool
    .map((recipe) => {
      let score = stableJitter(input.seed, recipe.id);
      if (loved.has(recipe.cuisine)) score += 3;
      if (totalMinutes(recipe) <= limit) score += 2;
      if (recipe.provenance === 'vetted') score += 1;
      if (input.planned.has(recipe.id)) score -= 4;
      if (recent.has(recipe.id)) score -= 3;
      return { recipe, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, input.count)
    .map((s) => s.recipe);
}
