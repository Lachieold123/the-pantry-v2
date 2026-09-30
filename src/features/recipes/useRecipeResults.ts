// Search text + filters → the recipes to show. Pure domain logic does the work;
// this hook only wires it to the store.
import { useDeferredValue, useMemo } from 'react';

import { countActiveFilters, matchesFilters, searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useAllRecipes, useRecipeSearchIndex } from '@/store/recipeBook';
import { useRecipeFilters } from '@/store/recipeFilters';
import { useSaved } from '@/store/saved';

export function useRecipeResults(): { browsing: boolean; results: Recipe[]; activeFilters: number } {
  // Deferred so typing stays instant: the field shows each letter straight
  // away and the results catch up when React has a moment.
  const query = useDeferredValue(useRecipeFilters((s) => s.query));
  const filters = useRecipeFilters((s) => s.filters);
  const showAll = useRecipeFilters((s) => s.showAll);
  const hidden = useSaved((s) => s.hidden);
  const all = useAllRecipes();
  const searchIndex = useRecipeSearchIndex();
  return useMemo(() => {
    const activeFilters = countActiveFilters(filters);
    const browsing = !showAll && query.trim() === '' && activeFilters === 0;
    const pool = browsing ? [] : query.trim() ? searchRecipes(searchIndex(), query) : all;
    const results = pool.filter((r) => !hidden.includes(r.id) && matchesFilters(r, filters));
    return { browsing, results, activeFilters };
  }, [query, filters, showAll, hidden, searchIndex, all]);
}
