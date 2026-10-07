// Home's ranking (docs/HOME-RANKING.md): which dishes, in what order, and the
// line that says why. Three steps:
//   1. Hard rules decide what may show at all: diet, leave-outs, "not for us",
//      and the Meal, Time, Cuisine and Difficulty filters. Nothing outweighs them.
//   2. Every dish left gets one score (score.ts): fit to now, what you have,
//      taste, freshness, quality, and a small daily nudge.
//   3. The top of each list is re-ranked for variety (diversify.ts).
// "What I have" and "Everything" use the same scorer with different weights.
// home.ts then lays the lists out as cards, grid and the Nearly there shelf.

import type { CookableMatch } from '../cupboard/cookable';
import type { IngredientIndex } from '../ingredients/database';
import type { AvoidList, DietPreference } from '../recipes/diets';
import type { TimeFilter } from '../recipes/search';
import type { CuisineId, Recipe } from '../recipes/types';
import { diversify, type Facets } from './diversify';
import { asRecipeFilters, type HomeFilters } from './home';
import { dayKind, mealWindow, quickLimit, seasonFor, timeBudget, type Moment } from './moment';
import { scoreRecipe, WEIGHTS, type Reason, type ScoreContext, type Weights } from './score';
import { deriveSignals, mainProtein, type History } from './signals';
import { eligibleForSurprise } from './surprise';

/** What the cook has told us in Settings: diet and leave-outs are hard rules; cuisines and weeknight time only reorder. */
export type Taste = { diet: DietPreference; avoid: AvoidList; cuisines: readonly CuisineId[]; weeknight: TimeFilter | undefined };

export type RankInput = {
  /** Every recipe this cook can see: the catalogue and their own. */
  recipes: readonly Recipe[];
  taste: Taste;
  hidden: ReadonlySet<string>;
  filters: HomeFilters;
  history: History;
  /** The shared cupboard engine's answer (store/cookable): ready and nearly dishes. Empty when the cupboard is. */
  cupboard: readonly CookableMatch[];
  index: IngredientIndex;
  moment: Moment;
  /** How many places at the top to re-rank for variety: the cards plus the grid. */
  depth: number;
};

export type HomeRanking = {
  /** Everything this cook may eat that fits the filters, best first. */
  picks: Recipe[];
  /** Dishes the cupboard can make now that fit the filters, best first. */
  ready: Recipe[];
  /** Dishes one or two things short, fewest missing first. */
  nearly: Recipe[];
  /** The one true line about each pick. */
  reasons: ReadonlyMap<string, Reason>;
};

export function rankHome(input: RankInput): HomeRanking {
  const { taste } = input;
  const pool = eligibleForSurprise({
    recipes: input.recipes,
    filters: asRecipeFilters(input.filters),
    diet: taste.diet,
    avoid: taste.avoid,
    hidden: input.hidden,
    index: input.index,
  });
  const inPool = new Set(pool.map((r) => r.id));
  const matches = input.cupboard.filter((m) => inPool.has(m.recipe.id));
  const ctx = contextFor(input, matches);
  const facetCache = new Map<string, Facets>();
  const facets = (r: Recipe): Facets => {
    let f = facetCache.get(r.id);
    if (!f) facetCache.set(r.id, (f = { cuisine: r.cuisine, protein: mainProtein(r, input.index) }));
    return f;
  };
  const scoreAll = (list: readonly Recipe[], w: Weights) => list.map((recipe) => ({ recipe, ...scoreRecipe(recipe, ctx, w) }));
  const ranked = (list: ReturnType<typeof scoreAll>) =>
    diversify(
      list.map((s) => ({ item: s.recipe, score: s.score, facets: facets(s.recipe) })),
      input.depth,
    );

  const everything = scoreAll(pool, WEIGHTS.all);
  const ready = scoreAll(
    matches.filter((m) => m.tier === 'ready').map((m) => m.recipe),
    WEIGHTS.pantry,
  );
  // The shelf reads in tiers, like SuperCook's: everything one short before anything two short.
  const missing = new Map(matches.map((m) => [m.recipe.id, m.result.missing.length] as const));
  const nearly = scoreAll(
    matches.filter((m) => m.tier === 'nearly').map((m) => m.recipe),
    WEIGHTS.pantry,
  ).sort((a, b) => (missing.get(a.recipe.id) ?? 0) - (missing.get(b.recipe.id) ?? 0) || b.score - a.score);

  const reasons = new Map<string, Reason>();
  for (const s of everything) if (s.reason) reasons.set(s.recipe.id, s.reason);
  return { picks: ranked(everything), ready: ranked(ready), nearly: nearly.map((s) => s.recipe), reasons };
}

/** Why one dish sits where it does, part by part: for tests and for tuning the weights. */
export function explainScore(recipe: Recipe, input: RankInput, mode: 'all' | 'pantry'): Readonly<Record<string, number>> {
  return scoreRecipe(recipe, contextFor(input, input.cupboard), WEIGHTS[mode]).parts;
}

function contextFor(input: RankInput, matches: readonly CookableMatch[]): ScoreContext {
  const { taste, moment } = input;
  const day = dayKind(moment.today);
  return {
    window: mealWindow(moment),
    mealChosen: input.filters.meal !== undefined,
    day,
    budget: timeBudget(taste.weeknight, day),
    quick: quickLimit(taste.weeknight),
    season: seasonFor(moment.today),
    liked: new Set(taste.cuisines),
    // Taste is learned from everything they've touched, hidden or filtered out included.
    signals: deriveSignals(input.history, new Map(input.recipes.map((r) => [r.id, r] as const)), moment.nowMs),
    cupboard: new Map(matches.map((m) => [m.recipe.id, m] as const)),
    seed: moment.today,
  };
}
