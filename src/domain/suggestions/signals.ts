// What this cook has done, boiled down for Home's ranking (docs/HOME-RANKING.md
// §2): how often and how lately each dish was cooked, what's in Cookmarks,
// what was opened lately, what's on this week's plan, and which cuisines they
// actually cook. Everything is derived from the stores' own records; nothing
// is stored twice. There are no star ratings in the app, so "cooked again" is
// the strongest sign a cook liked something.

import type { IngredientIndex } from '../ingredients/database';
import { allLines, type CuisineId, type Recipe } from '../recipes/types';

export type History = {
  /** Every cook, in any order. */
  cookLog: readonly { recipeId: string; cookedAt: number }[];
  bookmarks: readonly { recipeId: string; savedAt: number }[];
  /** Opened lately, most recent first (Library → Recent keeps 20). */
  recentlyViewed: readonly string[];
  /** On this week's plan, tonight's dinner included. */
  plannedThisWeek: ReadonlySet<string>;
};

export const NO_HISTORY: History = { cookLog: [], bookmarks: [], recentlyViewed: [], plannedThisWeek: new Set() };

export type RecipeHistory = {
  cooks: number;
  /** Whole days since the last cook; undefined if never cooked. */
  daysSinceCooked: number | undefined;
  saved: boolean;
  /** 0 is the most recently opened; undefined if not in Recent. */
  viewedRank: number | undefined;
  planned: boolean;
};

export type Signals = {
  of: (recipeId: string) => RecipeHistory;
  /** Cook events per cuisine, for "You often cook Thai". */
  cuisineCooks: ReadonlyMap<CuisineId, number>;
  /** Cook events of recipes that still exist. */
  totalCooks: number;
  /** 0–1: how much this cook leans to each cuisine, from what they cook, save and open. The top cuisine is 1. */
  cuisineAffinity: ReadonlyMap<CuisineId, number>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** How much each kind of action says about taste. Cooking is the strongest: it took an evening. */
const AFFINITY = { cook: 1, oldCook: 0.5, save: 0.6, view: 0.3 } as const;
/** Cooks older than this count half: tastes drift. */
const OLD_COOK_DAYS = 180;
/** Below this much evidence, a lean is noise (one opened recipe isn't a taste). */
const MIN_AFFINITY_EVIDENCE = 2;

const EMPTY: RecipeHistory = { cooks: 0, daysSinceCooked: undefined, saved: false, viewedRank: undefined, planned: false };

export function deriveSignals(history: History, recipesById: ReadonlyMap<string, Recipe>, nowMs: number): Signals {
  const cooks = new Map<string, { count: number; last: number }>();
  for (const e of history.cookLog) {
    const prev = cooks.get(e.recipeId);
    cooks.set(e.recipeId, { count: (prev?.count ?? 0) + 1, last: Math.max(prev?.last ?? -Infinity, e.cookedAt) });
  }
  const saved = new Set(history.bookmarks.map((b) => b.recipeId));
  const viewed = new Map(history.recentlyViewed.map((id, i) => [id, i] as const));

  const cuisineCooks = new Map<CuisineId, number>();
  let totalCooks = 0;
  const weight = new Map<CuisineId, number>();
  const lean = (id: string, w: number) => {
    const cuisine = recipesById.get(id)?.cuisine;
    if (cuisine) weight.set(cuisine, (weight.get(cuisine) ?? 0) + w);
  };
  for (const e of history.cookLog) {
    const cuisine = recipesById.get(e.recipeId)?.cuisine;
    if (!cuisine) continue; // A recipe since deleted says nothing about the catalogue.
    cuisineCooks.set(cuisine, (cuisineCooks.get(cuisine) ?? 0) + 1);
    totalCooks++;
    lean(e.recipeId, (nowMs - e.cookedAt) / DAY_MS > OLD_COOK_DAYS ? AFFINITY.oldCook : AFFINITY.cook);
  }
  for (const id of saved) lean(id, AFFINITY.save);
  for (const id of viewed.keys()) lean(id, AFFINITY.view);

  const total = [...weight.values()].reduce((a, b) => a + b, 0);
  const top = Math.max(0, ...weight.values());
  const cuisineAffinity = new Map<CuisineId, number>(
    total >= MIN_AFFINITY_EVIDENCE && top > 0 ? [...weight].map(([c, w]) => [c, w / top] as const) : [],
  );

  return {
    of: (id) => {
      const c = cooks.get(id);
      const isSaved = saved.has(id);
      const rank = viewed.get(id);
      const planned = history.plannedThisWeek.has(id);
      if (!c && !isSaved && rank === undefined && !planned) return EMPTY;
      return {
        cooks: c?.count ?? 0,
        // A cook stamped in the future (a phone clock put right) counts as today.
        daysSinceCooked: c ? Math.max(0, Math.floor((nowMs - c.last) / DAY_MS)) : undefined,
        saved: isSaved,
        viewedRank: rank,
        planned,
      };
    },
    cuisineCooks,
    totalCooks,
    cuisineAffinity,
  };
}

export type Protein = 'beef' | 'pork' | 'lamb' | 'poultry' | 'seafood' | 'meat';

/**
 * The dish's main protein, for variety: the first meat or seafood in its
 * ingredient list (recipes list the star first). Undefined for meat-free
 * dishes, which don't count as "the same protein" as each other: for a
 * vegetarian cook, cuisine carries the variety instead.
 */
export function mainProtein(recipe: Recipe, index: IngredientIndex): Protein | undefined {
  for (const line of allLines(recipe)) {
    if (!line.ingredientId || line.optional) continue;
    const groups = index.byId.get(line.ingredientId)?.groups ?? [];
    if (groups.includes('fish') || groups.includes('shellfish')) return 'seafood';
    for (const g of ['beef', 'pork', 'lamb', 'poultry'] as const) if (groups.includes(g)) return g;
    if (groups.includes('meat')) return 'meat';
  }
  return undefined;
}
