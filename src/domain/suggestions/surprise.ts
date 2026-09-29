// Surprise me: pick one recipe the cook can actually eat tonight.
// Unlike the old spinner, the diet and avoid list are hard rules (D-006),
// not suggestions, and the randomness is injectable so tests are exact.

import type { IngredientIndex } from '../ingredients/database';
import { containsAvoided, fitsDietPreference, type AvoidList, type DietPreference } from '../recipes/diets';
import { matchesFilters, type RecipeFilters } from '../recipes/search';
import type { Recipe } from '../recipes/types';

export type SurpriseInput = {
  recipes: readonly Recipe[];
  filters: RecipeFilters;
  diet: DietPreference;
  avoid: AvoidList;
  hidden: ReadonlySet<string>;
  /** Recipe ids already on this week's plan. */
  planned: ReadonlySet<string>;
  /** Recipe ids cooked recently, most recent first. */
  recentlyCooked: readonly string[];
  /** Recipe ids already shown this spinning session. */
  alreadyShown: readonly string[];
  index: IngredientIndex;
  random: () => number;
};

/** Everything that may ever be picked: the hard rules. */
export function eligibleForSurprise(input: Omit<SurpriseInput, 'random' | 'recentlyCooked' | 'alreadyShown' | 'planned'>): Recipe[] {
  return input.recipes.filter(
    (r) =>
      !input.hidden.has(r.id) &&
      fitsDietPreference(r, input.diet) &&
      matchesFilters(r, input.filters) &&
      !containsAvoided(r, input.avoid, input.index),
  );
}

/**
 * Soft rules narrow the pool in order (not planned, not cooked in the last
 * 14 picks' worth, not shown already this session), but each is dropped if it
 * would leave nothing, so a small pool still spins. Returns undefined only when
 * the hard rules leave nothing at all: that's the "loosen your filters" state.
 */
export function pickSurprise(input: SurpriseInput): Recipe | undefined {
  const hard = eligibleForSurprise(input);
  if (hard.length === 0) return undefined;
  const recent = new Set(input.recentlyCooked.slice(0, 14));
  const shown = new Set(input.alreadyShown);
  let pool = hard;
  for (const exclude of [input.planned, recent, shown]) {
    const narrower = pool.filter((r) => !exclude.has(r.id));
    if (narrower.length > 0) pool = narrower;
  }
  const i = Math.min(pool.length - 1, Math.floor(input.random() * pool.length));
  return pool[i];
}
