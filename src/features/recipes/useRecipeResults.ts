// Search text + filters → the recipes to show. Pure domain logic does the work;
// this hook only wires it to the store.
import { useMemo } from 'react';

import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { countActiveFilters, indexForSearch, matchesFilters, searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useAllRecipes } from '@/store/recipeBook';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useSaved } from '@/store/saved';

export function useRecipeResults(): { browsing: boolean; results: Recipe[]; activeFilters: number } {
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  const hidden = useSaved((s) => s.hidden);
  const all = useAllRecipes();
  const searchIndex = useMemo(() => indexForSearch(all, (c) => CUISINE_LABELS[c]), [all]);
  return useMemo(() => {
    const activeFilters = countActiveFilters(filters);
    const browsing = query.trim() === '' && activeFilters === 0;
    const results = browsing ? [] : searchRecipes(searchIndex, query).filter((r) => !hidden.includes(r.id) && matchesFilters(r, filters));
    return { browsing, results, activeFilters };
  }, [query, filters, hidden, searchIndex]);
}
