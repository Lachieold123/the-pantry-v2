// Search text + filters → the recipes to show. Pure domain logic does the work;
// this hook only wires it to the store.
import { useMemo } from 'react';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { CUISINE_LABELS } from '@/domain/recipes/labels';
import { countActiveFilters, indexForSearch, matchesFilters, searchRecipes } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { useRecipeFilters } from '@/store/recipeFilters';

const SEARCH_INDEX = indexForSearch(CATALOGUE, (c) => CUISINE_LABELS[c]);

export function useRecipeResults(): { browsing: boolean; results: Recipe[]; activeFilters: number } {
  const query = useRecipeFilters((s) => s.query);
  const filters = useRecipeFilters((s) => s.filters);
  return useMemo(() => {
    const activeFilters = countActiveFilters(filters);
    const browsing = query.trim() === '' && activeFilters === 0;
    const results = browsing ? [] : searchRecipes(SEARCH_INDEX, query).filter((r) => matchesFilters(r, filters));
    return { browsing, results, activeFilters };
  }, [query, filters]);
}
