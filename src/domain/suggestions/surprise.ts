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
  return softPick(hard, [input.planned, new Set(input.recentlyCooked.slice(0, 14)), new Set(input.alreadyShown)], input.random);
}

/** Narrows by each set of ids to leave out, in order, skipping any that would leave nothing. */
export function softPick<T extends { id: string }>(
  pool: readonly T[],
  leaveOut: readonly ReadonlySet<string>[],
  random: () => number,
): T | undefined {
  let narrowed = pool;
  for (const exclude of leaveOut) {
    const narrower = narrowed.filter((r) => !exclude.has(r.id));
    if (narrower.length > 0) narrowed = narrower;
  }
  const i = Math.min(narrowed.length - 1, Math.floor(random() * narrowed.length));
  return narrowed[i];
}
