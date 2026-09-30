// "What can I cook with what I have?", wired to the cupboard and to what this
// cook eats. Every screen that shows cupboard matches reads it from here, so
// they always agree. Diet, the avoid list and "not for us" always apply (the
// old Cupboard and Browse sections ignored them: a vegetarian saw chicken).
import { useMemo } from 'react';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { addOneThing, popularIngredients, quickAdds, whatCanICook, type CookableMatch } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { toISODate } from '@/domain/plan/week';
import { NO_FILTERS } from '@/domain/recipes/search';
import { eligibleForSurprise } from '@/domain/suggestions/surprise';
import { useCupboard } from './cupboard';
import { usePreferences } from './preferences';
import { useAllRecipes } from './recipeBook';
import { useSaved } from './saved';

export type CookableNow = {
  ready: CookableMatch[];
  nearly: CookableMatch[];
  unlocks: { id: string; unlocks: number }[];
  /** Ingredients worth adding next, from what this cook's recipes use most. */
  quick: string[];
  have: ReadonlySet<string>;
};

export function useCookableNow(): CookableNow {
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  const bookmarks = useSaved((s) => s.bookmarks);
  const recipes = useAllRecipes();
  const today = toISODate(new Date());
  return useMemo(() => {
    const have = cupboardIds(items);
    const eats = eligibleForSurprise({ recipes, filters: NO_FILTERS, diet, avoid, hidden: new Set(hidden), index: INGREDIENTS });
    const { ready, nearly } = whatCanICook({
      recipes: eats,
      have,
      shelf,
      index: INGREDIENTS,
      kitchen: KITCHEN,
      saved: new Set(bookmarks.map((b) => b.recipeId)),
      seed: today,
    });
    return { ready, nearly, unlocks: addOneThing(nearly), quick: quickAdds(eats, have, INGREDIENTS, KITCHEN), have };
  }, [items, shelf, diet, avoid, hidden, bookmarks, recipes, today]);
}

/** The name a cook reads for an ingredient id. */
export function ingredientName(id: string): string {
  return INGREDIENTS.byId.get(id)?.name ?? id;
}

/** Ingredients by how often this cook's recipes use them, for the stocking grid. */
export function usePopularIngredients(): string[] {
  const recipes = useAllRecipes();
  return useMemo(() => popularIngredients(recipes, INGREDIENTS), [recipes]);
}
