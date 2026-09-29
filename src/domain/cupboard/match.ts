// What's in the cupboard, and what it lets you cook. The cupboard stores
// ingredient ids only, with no quantities (D-010), so matching is about
// presence: "do you have it at all?"

import type { IngredientIndex } from '../ingredients/database';
import { allLines, type Recipe } from '../recipes/types';

export type CupboardItem = { ingredientId: string; addedAt: number; source: 'manual' | 'shop' };

export function cupboardIds(items: readonly CupboardItem[]): Set<string> {
  return new Set(items.map((i) => i.ingredientId));
}

/** Add ingredients, ignoring ones already there. Returns the same array when nothing changes. */
export function addToCupboard(
  items: readonly CupboardItem[],
  ids: readonly string[],
  source: CupboardItem['source'],
  now: number,
): CupboardItem[] {
  const have = cupboardIds(items);
  const fresh = [...new Set(ids)].filter((id) => !have.has(id)).map((ingredientId) => ({ ingredientId, addedAt: now, source }));
  return fresh.length ? [...items, ...fresh] : (items as CupboardItem[]);
}

export type Coverage = {
  /** Distinct ingredients the recipe needs (staples and optional lines excluded). */
  needed: number;
  have: number;
  missing: string[];
  /** 0–1. */
  ratio: number;
};

export function recipeCoverage(recipe: Recipe, cupboard: ReadonlySet<string>, index: IngredientIndex): Coverage {
  const needed = new Set<string>();
  for (const line of allLines(recipe)) {
    if (line.optional || line.quantity === undefined || !line.ingredientId) continue;
    if (index.byId.get(line.ingredientId)?.staple) continue;
    needed.add(line.ingredientId);
  }
  const missing = [...needed].filter((id) => !cupboard.has(id));
  const have = needed.size - missing.length;
  return { needed: needed.size, have, missing, ratio: needed.size === 0 ? 1 : have / needed.size };
}

/**
 * "What can I make?": recipes ranked by how much of them you already have.
 * A recipe must use at least one thing from your cupboard to appear, so an
 * empty cupboard gives an empty (designed) state rather than a random list.
 * Ties go to the recipe missing fewer things, then the quicker one.
 */
export function whatCanIMake(
  recipes: readonly Recipe[],
  cupboard: ReadonlySet<string>,
  index: IngredientIndex,
  limit = 30,
): { recipe: Recipe; coverage: Coverage }[] {
  if (cupboard.size === 0) return [];
  return recipes
    .map((recipe) => ({ recipe, coverage: recipeCoverage(recipe, cupboard, index) }))
    .filter((r) => r.coverage.have > 0)
    .sort(
      (a, b) =>
        b.coverage.ratio - a.coverage.ratio ||
        a.coverage.missing.length - b.coverage.missing.length ||
        a.recipe.prepMinutes + a.recipe.cookMinutes - (b.recipe.prepMinutes + b.recipe.cookMinutes),
    )
    .slice(0, limit);
}
