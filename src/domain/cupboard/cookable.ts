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
import { blocksMatch, COVER_CREDIT } from '../ingredients/hierarchy';
import type { Kitchen } from './kitchen';

/** The "always in my kitchen" setting: assume a stocked shelf, or only what you've ticked. */
export type Shelf = {
  mode: 'assume' | 'mine';
  ids: readonly string[];
  /** Cooking oil counts as always in (the default). Off: recipes need oil like anything else. */
  oil?: boolean;
  /** Substitutes (dried thyme for fresh) count as having it. Off by default: they only earn partial credit. */
  substitutes?: boolean;
};
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
  /** Missing things you have a substitute for (also in `missing` unless substitutes are on). */
  partial?: { need: string; use: string }[];
  /** How many fresh (perishable) things from the cupboard it uses up. */
  perishablesUsed: number;
};

export type Tier = 'ready' | 'nearly';
export const NEARLY_MAX_MISSING = 2;

export function onShelf(id: string, shelf: Shelf, kitchen: Kitchen): boolean {
  if (!kitchen.isShelf(id)) return false;
  return shelf.mode === 'assume' || shelf.ids.includes(id);
}

/**
 * Sorts each ingredient a recipe needs. Optional, garnish, "to serve" and
 * unmeasured lines don't count. With the ingredient model (kitchen.model) a
 * kind covers its generic, a variety generic covers its kinds, and
 * substitutes earn partial credit; bad generator links are fixed first.
 */
export function cookable(
  recipe: Pick<Recipe, 'ingredientGroups'>,
  have: ReadonlySet<string>,
  shelf: Shelf,
  index: IngredientIndex,
  kitchen: Kitchen,
): Cookable {
  const result: Cookable = { have: [], swaps: [], shelf: [], missing: [], perishablesUsed: 0 };
  const model = kitchen.model;
  const seen = new Set<string>();
  for (const line of allLines(recipe)) {
    const id = model ? model.relink(line) : line.ingredientId;
    if (!id || seen.has(id)) continue;
    if (model ? !blocksMatch(line) : line.optional || line.quantity === undefined) continue;
    seen.add(id);
    const def = index.byId.get(id);
    if (def?.staple && !(model?.isOil(id) && shelf.oil === false)) continue;
    if (have.has(id)) {
      result.have.push(id);
      if (kitchen.isPerishable(id)) result.perishablesUsed++;
      continue;
    }
    const cover = model ? model.bestCover(id, have) : undefined;
    const stand = cover && cover.kind !== 'substitute' ? cover.id : model ? undefined : kitchen.swapsFor(id).find((s) => have.has(s));
    if (stand || (cover && shelf.substitutes)) {
      const use = stand ?? cover!.id;
      result.swaps.push({ need: id, use });
      if (kitchen.isPerishable(use)) result.perishablesUsed++;
      continue;
    }
    if (onShelf(id, shelf, kitchen)) {
      result.shelf.push(id);
      continue;
    }
    result.missing.push(id);
    if (cover) (result.partial ??= []).push({ need: id, use: cover.id });
  }
  return result;
}

/** 0..1: how much of what the recipe needs you have, substitutes at partial credit. Shelf items count as had. */
export function coverShare(c: Cookable): number {
  const partial = (c.partial ?? []).length;
  const total = c.have.length + c.swaps.length + c.shelf.length + c.missing.length;
  if (total === 0) return 0;
  return (c.have.length + c.swaps.length + c.shelf.length + partial * COVER_CREDIT.substitute) / total;
}

/**
 * The shopping list's "do I have it?" (BUG-06): the stand-in you have, or
 * 'shelf' for a shelf item you're assumed to keep. Exact matches are the
 * caller's to check. The same rules as `cookable`, so the list and "What I
 * have" never disagree.
 */
export function coverFor(id: string, have: ReadonlySet<string>, shelf: Shelf, kitchen: Kitchen): string | undefined {
  const cover = kitchen.model?.bestCover(id, have);
  const viaModel = cover && cover.id !== id && (cover.kind !== 'substitute' || shelf.substitutes) ? cover.id : undefined;
  const stand = kitchen.model ? viaModel : kitchen.swapsFor(id).find((s) => have.has(s));
  if (stand) return stand;
  return onShelf(id, shelf, kitchen) ? 'shelf' : undefined;
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

/** The line a card shows instead of v1's percentage: "Ready", "Need 1: lemon", "Need 2: lemon, feta". */
export function needLine(c: Cookable, nameOf: (id: string) => string): string {
  if (c.missing.length === 0) return 'Ready to cook';
  const subFor = new Map((c.partial ?? []).map((p) => [p.need, p.use]));
  const words = c.missing.map((id) => (subFor.has(id) ? `${nameOf(id)} (or your ${nameOf(subFor.get(id)!)})` : nameOf(id)));
  return `Need ${c.missing.length}: ${words.join(', ')}`;
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
