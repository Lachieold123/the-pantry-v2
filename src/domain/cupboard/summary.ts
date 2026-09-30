// What the recipe page's cupboard card says, worked out from the same
// `cookable` result as everything else, so its numbers and the HAVE pills in
// the ingredient list can never disagree (cupboard-brief §4.4).

import { allLines, type Recipe } from '../recipes/types';
import type { Cookable } from './cookable';

export type CupboardTally = {
  /** The ingredients that earn a HAVE pill: what you have, plus what a stand-in you have covers. */
  haveIds: ReadonlySet<string>;
  /** "You have {have} of {total}", counted in lines, exactly as the pills are drawn. */
  have: number;
  total: number;
};

/**
 * The ingredient list draws a HAVE pill on every line whose ingredient is in
 * `haveIds`, so "have" counts those lines: a recipe that uses garlic twice
 * shows two pills and counts two. "total" adds the lines for what's missing.
 * Shelf items ("check you have") are neither had nor missing, so they're in
 * neither number: counting them as had (as the card once did) showed more
 * than the pills.
 */
export function cupboardTally(recipe: Pick<Recipe, 'ingredientGroups'>, result: Cookable): CupboardTally {
  const haveIds = new Set([...result.have, ...result.swaps.map((s) => s.need)]);
  const missing = new Set(result.missing);
  let have = 0;
  let need = 0;
  for (const line of allLines(recipe)) {
    if (!line.ingredientId) continue;
    if (haveIds.has(line.ingredientId)) have++;
    else if (missing.has(line.ingredientId)) need++;
  }
  return { haveIds, have, total: have + need };
}

/**
 * The recipe's own word for each ingredient ("courgette"), from its first
 * line. The card talks about the recipe in front of you, so it shouldn't
 * switch to the database's name ("zucchini").
 */
export function recipeWords(recipe: Pick<Recipe, 'ingredientGroups'>): ReadonlyMap<string, string> {
  const words = new Map<string, string>();
  for (const line of allLines(recipe)) {
    if (line.ingredientId && !words.has(line.ingredientId) && line.item.trim()) words.set(line.ingredientId, line.item.trim());
  }
  return words;
}

/** True when every id is already an extra on the shopping list, so "Add to list" has nothing left to do. */
export function allOnList(ids: readonly string[], extras: readonly { ingredientId?: string | undefined }[]): boolean {
  if (ids.length === 0) return false;
  const onList = new Set(extras.flatMap((x) => (x.ingredientId ? [x.ingredientId] : [])));
  return ids.every((id) => onList.has(id));
}
