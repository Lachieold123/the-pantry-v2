// The Cupboard tab's two match shelves, as v1 laid them out: "From your saved"
// (your Cookmarks, closest first) and "Suggested for you" (the rest of what
// the cupboard cooks). Both come from the one engine in cookable.ts, so a
// recipe never reads one way here and another on Home.
//
// v1's saved shelf showed every bookmark with a percentage ("43% · 8 to buy").
// A percentage over 14 ingredients says little, so here a saved recipe shows
// how many things it needs, and it only appears when it uses something you
// have: a bookmark that shares nothing with the cupboard isn't a match.

import type { IngredientIndex } from '../ingredients/database';
import type { Recipe } from '../recipes/types';
import { cookable, needLine, NEARLY_MAX_MISSING, type Cookable, type CookableMatch, type Shelf } from './cookable';
import type { Kitchen } from './kitchen';

export type SavedMatch = { recipe: Recipe; result: Cookable; ready: boolean };

export type SavedInput = {
  /** Already limited to what this cook will eat (diet, avoid list, "not for us"). */
  recipes: readonly Recipe[];
  /** Saved recipe ids, newest first: the order breaks ties. */
  saved: readonly string[];
  have: ReadonlySet<string>;
  shelf: Shelf;
  index: IngredientIndex;
  kitchen: Kitchen;
};

/** Saved recipes that use something from the cupboard: fewest things to buy, then most used, then newest saved. */
export function savedMatches(input: SavedInput): SavedMatch[] {
  if (input.have.size === 0 || input.saved.length === 0) return [];
  const byId = new Map(input.recipes.map((r) => [r.id, r]));
  return input.saved
    .map((id, order) => {
      const recipe = byId.get(id);
      if (!recipe) return undefined;
      const result = cookable(recipe, input.have, input.shelf, input.index, input.kitchen);
      const uses = result.have.length + result.swaps.length;
      if (uses === 0) return undefined;
      return { match: { recipe, result, ready: result.missing.length === 0 }, uses, order };
    })
    .filter((m) => m !== undefined)
    .sort((a, b) => a.match.result.missing.length - b.match.result.missing.length || b.uses - a.uses || a.order - b.order)
    .map((m) => m.match);
}

/** "Suggested for you": the engine's matches, best first, leaving out what the saved shelf already shows. */
export function suggestedMatches(ready: readonly CookableMatch[], nearly: readonly CookableMatch[], fromSaved: readonly SavedMatch[]) {
  const shown = new Set(fromSaved.map((m) => m.recipe.id));
  return [...ready, ...nearly].filter((m) => !shown.has(m.recipe.id));
}

/**
 * A saved card's line: "Ready to cook", "Need 1: lemon", or past two things
 * just the count ("5 to buy"), because a list of five names won't fit a card.
 */
export function savedNeedLine(c: Cookable, nameOf: (id: string) => string): string {
  if (c.missing.length <= NEARLY_MAX_MISSING) return needLine(c, nameOf);
  return `${c.missing.length} to buy`;
}

/** The suggested shelf's kicker counts, so they follow what the shelf shows. */
export function tierCounts(matches: readonly CookableMatch[]): { ready: number; nearly: number } {
  const ready = matches.filter((m) => m.tier === 'ready').length;
  return { ready, nearly: matches.length - ready };
}
