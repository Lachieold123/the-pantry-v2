// The welcome's "What's in your cupboard?" grid. It reuses the Cupboard's quick
// adds (the fresh and main things this cook's recipes use most), so a
// vegetarian never sees chicken and the grid can't drift from the real
// catalogue the way a hand-written list would. Shelf items (spices, oils,
// sauces) are left out: they're assumed until the cook says otherwise.

import { quickAdds } from '../cupboard/cookable';
import { CUPBOARD_CATEGORIES, type Kitchen } from '../cupboard/kitchen';
import type { IngredientIndex } from '../ingredients/database';
import type { Recipe } from '../recipes/types';

/** Enough to cover a typical fridge and pantry, few enough to scan in one look. */
export const WELCOME_PICKS = 24;

/**
 * The ingredients to offer, most useful first within each cupboard jar
 * (proteins, then vegetables, fruit, dairy...), so the grid reads as a tidy
 * shopping trip rather than a ranked list. Anything already in the cupboard is
 * left out, so redoing the welcome only offers what's new.
 */
export function welcomeCupboardPicks(
  recipes: readonly Recipe[],
  have: ReadonlySet<string>,
  index: IngredientIndex,
  kitchen: Kitchen,
  limit = WELCOME_PICKS,
): string[] {
  const jar = (id: string) => CUPBOARD_CATEGORIES.indexOf(kitchen.category(id));
  return quickAdds(recipes, have, index, kitchen, limit)
    .map((id, rank) => ({ id, rank }))
    .sort((a, b) => jar(a.id) - jar(b.id) || a.rank - b.rank)
    .map(({ id }) => id);
}

/** The running count under the grid: "Tap what you have", "1 thing", "8 things". */
export function pickedLabel(count: number): string {
  if (count === 0) return 'Tap what you have';
  return `${count} ${count === 1 ? 'thing' : 'things'}`;
}
