// The Recipes tab's search text and filters. Kept for the session only:
// a fresh launch starts with the full catalogue.
import { create } from 'zustand';

import { NO_FILTERS, type RecipeFilters } from '@/domain/recipes/search';

type RecipeFiltersState = {
  query: string;
  filters: RecipeFilters;
  setQuery: (query: string) => void;
  update: (patch: Partial<RecipeFilters>) => void;
  clear: () => void;
};

export const useRecipeFilters = create<RecipeFiltersState>()((set) => ({
  query: '',
  filters: NO_FILTERS,
  setQuery: (query) => set({ query }),
  update: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clear: () => set({ filters: NO_FILTERS }),
}));

/** Adds the value if absent, removes it if present. */
export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
