// "What can I cook with what I have?" One function, used by every screen, so
// the Cupboard, Browse, the Feed and the recipe page never disagree (v1 had
// three matchers that did). Presence only, no quantities (D-010).
//
// v2's recipes need a median of 14 non-staple ingredients, so "have
// everything" is almost always empty and a percentage over everything is
// meaningless (v1's "273 picked for you"). Instead each ingredient is sorted:
// have, swap (a same-family stand-in), staple, shelf (spices, sauces and
// basics you most likely keep) or missing. A recipe is Ready when nothing is
// missing, and Nearly when only one or two things are (cupboard-brief §4.3).

import type { IngredientIndex } from '../ingredients/database';
import { stableJitter } from '../suggestions/forYou';
import { allLines, totalMinutes, type Recipe } from '../recipes/types';
import type { Kitchen } from './kitchen';

/** The "always in my kitchen" setting: assume a stocked shelf, or only what you've ticked. */
export type Shelf = { mode: 'assume' | 'mine'; ids: readonly string[] };
export const DEFAULT_SHELF: Shelf = { mode: 'assume', ids: [] };

export type Cookable = {
  /** Ingredients you have, by id. */
  have: string[];
  /** Needed ingredients covered by a stand-in you have. */
  swaps: { need: string; use: string }[];
  /** Shelf items the recipe uses that you're assumed to have: "check you have". */
  shelf: string[];
  /** Everything else: the things to buy. */
  missing: string[];
  /** How many fresh (perishable) things from the cupboard it uses up. */
  perishablesUsed: number;
};

export type Tier = 'ready' | 'nearly';
export const NEARLY_MAX_MISSING = 2;

export function onShelf(id: string, shelf: Shelf, kitchen: Kitchen): boolean {
  if (!kitchen.isShelf(id)) return false;
  return shelf.mode === 'assume' || shelf.ids.includes(id);
}

/** Sorts each ingredient a recipe needs. Optional and unquantified lines ("to serve") don't count. */
export function cookable(recipe: Recipe, have: ReadonlySet<string>, shelf: Shelf, index: IngredientIndex, kitchen: Kitchen): Cookable {
  const result: Cookable = { have: [], swaps: [], shelf: [], missing: [], perishablesUsed: 0 };
  const seen = new Set<string>();
  for (const line of allLines(recipe)) {
    const id = line.ingredientId;
    if (!id || line.optional || line.quantity === undefined || seen.has(id)) continue;
    seen.add(id);
    if (index.byId.get(id)?.staple) continue;
    if (have.has(id)) {
      result.have.push(id);
      if (kitchen.isPerishable(id)) result.perishablesUsed++;
      continue;
    }
    const stand = kitchen.swapsFor(id).find((s) => have.has(s));
    if (stand) {
      result.swaps.push({ need: id, use: stand });
      if (kitchen.isPerishable(stand)) result.perishablesUsed++;
      continue;
    }
    if (onShelf(id, shelf, kitchen)) result.shelf.push(id);
    else result.missing.push(id);
  }
  return result;
}

/** Ready (nothing to buy) or Nearly (one or two things). A recipe must use something from your cupboard to count at all. */
export function tierOf(c: Cookable): Tier | undefined {
  if (c.have.length + c.swaps.length === 0) return undefined;
  if (c.missing.length === 0) return 'ready';
  return c.missing.length <= NEARLY_MAX_MISSING ? 'nearly' : undefined;
}

export type CookableMatch = { recipe: Recipe; result: Cookable; tier: Tier };

export type CookInput = {
  /** Already limited to what this cook will eat (diet, avoid list, "not for us"). */
  recipes: readonly Recipe[];
  have: ReadonlySet<string>;
  shelf: Shelf;
  index: IngredientIndex;
  kitchen: Kitchen;
  saved: ReadonlySet<string>;
  /** Today's date: the order is stable all day. */
  seed: string;
};

/**
 * Both tiers, best first: uses the most of your cupboard (fresh food counts
 * extra, so it gets used up), then saved recipes, fewer swaps, quicker.
 */
export function whatCanICook(input: CookInput): { ready: CookableMatch[]; nearly: CookableMatch[] } {
  if (input.have.size === 0) return { ready: [], nearly: [] };
  const scored = input.recipes
    .map((recipe) => {
      const result = cookable(recipe, input.have, input.shelf, input.index, input.kitchen);
      const tier = tierOf(result);
      if (!tier) return undefined;
      const uses = result.have.length + result.swaps.length;
      const score =
        uses * 2 +
        result.perishablesUsed +
        (input.saved.has(recipe.id) ? 3 : 0) -
        result.swaps.length * 0.5 -
        totalMinutes(recipe) / 120 +
        stableJitter(input.seed, recipe.id) * 0.5;
      return { match: { recipe, result, tier }, score };
    })
    .filter((s) => s !== undefined)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.match);
  return { ready: scored.filter((m) => m.tier === 'ready'), nearly: scored.filter((m) => m.tier === 'nearly') };
}

/**
 * "Add one thing": the single ingredients that would make the most Nearly
 * recipes Ready. Counts only recipes missing exactly that one thing, so the
 * promise ("makes 4 more ready") is literally true.
 */
export function addOneThing(nearly: readonly CookableMatch[], limit = 3): { id: string; unlocks: number }[] {
  const counts = new Map<string, number>();
  for (const m of nearly) {
    const [only] = m.result.missing;
    if (m.result.missing.length === 1 && only) counts.set(only, (counts.get(only) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, unlocks]) => ({ id, unlocks }))
    .sort((a, b) => b.unlocks - a.unlocks || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** The line a card shows instead of v1's percentage: "Ready", "Need 1: lemon", "Need 2: lemon, feta". */
export function needLine(c: Cookable, nameOf: (id: string) => string): string {
  if (c.missing.length === 0) return 'Ready to cook';
  return `Need ${c.missing.length}: ${c.missing.map(nameOf).join(', ')}`;
}

/**
 * Quick adds: the fresh and main ingredients recipes use most, that you don't
 * have yet. Worked out from the catalogue rather than a hard-coded list, so it
 * suits the recipes this cook can actually eat.
 */
export function quickAdds(
  recipes: readonly Recipe[],
  have: ReadonlySet<string>,
  index: IngredientIndex,
  kitchen: Kitchen,
  limit = 10,
): string[] {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    const seen = new Set<string>();
    for (const line of allLines(recipe)) {
      const id = line.ingredientId;
      if (!id || line.optional || seen.has(id) || have.has(id)) continue;
      seen.add(id);
      if (index.byId.get(id)?.staple || kitchen.isShelf(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
}
