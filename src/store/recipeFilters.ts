// Browse's search text and filters. Kept for the session only: a fresh launch
// starts on the browse shelves.
import { create } from 'zustand';

import { NO_FILTERS, type RecipeFilters } from '@/domain/recipes/search';

type RecipeFiltersState = {
  query: string;
  filters: RecipeFilters;
  /** "See all recipes": the full list with nothing filtered. */
  showAll: boolean;
  setQuery: (query: string) => void;
  update: (patch: Partial<RecipeFilters>) => void;
  /**
   * The chip or shelf last tapped. Several share the same filters ("30 min"
   * and "Under 30 minutes"), so the results pill needs to know which one you chose.
   */
  presetLabel: string | undefined;
  /** Sets search and filters together (a chip or a mood shelf). */
  apply: (next: { filters: RecipeFilters; query: string }, presetLabel?: string) => void;
  setShowAll: (showAll: boolean) => void;
  clear: () => void;
};

export const useRecipeFilters = create<RecipeFiltersState>()((set) => ({
  query: '',
  filters: NO_FILTERS,
  showAll: false,
  presetLabel: undefined,
  setQuery: (query) => set({ query }),
  update: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  apply: ({ filters, query }, presetLabel) => set({ filters, query, presetLabel }),
  setShowAll: (showAll) => set({ showAll }),
  clear: () => set({ filters: NO_FILTERS, showAll: false }),
}));

/** Adds the value if absent, removes it if present. */
export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
