// Search text + filters → the recipes to show. Pure domain logic does the work;
// this hook only wires it to the store. It searches only what this cook eats
// (diet, avoid list, hidden), so results match the shelves' counts (BUG-07).
import { useMemo } from 'react';

import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { countActiveFilters, indexForSearch, matchesFilters, searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useEatableRecipes } from '@/store/eatable';
import { useRecipeFilters } from '@/store/recipeFilters';

export function useRecipeResults(): { browsing: boolean; results: Recipe[]; activeFilters: number } {
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  const showAll = useRecipeFilters((s) => s.showAll);
  const eatable = useEatableRecipes();
  const searchIndex = useMemo(() => indexForSearch(eatable, (c) => CUISINE_LABELS[c]), [eatable]);
  return useMemo(() => {
    const activeFilters = countActiveFilters(filters);
    const browsing = !showAll && query.trim() === '' && activeFilters === 0;
    const results = browsing ? [] : searchRecipes(searchIndex, query).filter((r) => matchesFilters(r, filters));
    return { browsing, results, activeFilters };
  }, [query, filters, showAll, searchIndex]);
}
