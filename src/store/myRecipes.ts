// Recipes you've written or imported, stored as the words you typed.
// The structured Recipe is derived when read (see domain/recipes/draft.ts).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RecipeDraft } from '@/domain/recipes/draft';
import type { RecipeSource } from '@/domain/recipes/types';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type MyRecipe = {
  id: string;
  draft: RecipeDraft;
  source: Exclude<RecipeSource, 'house'>;
  /** Where an imported recipe came from, shown on the recipe page. */
  sourceUrl?: string | undefined;
  createdAt: number;
  updatedAt: number;
};

type MyRecipesState = {
  recipes: Record<string, MyRecipe>;
  save: (recipe: Omit<MyRecipe, 'createdAt' | 'updatedAt'>) => void;
  remove: (id: string) => MyRecipe | undefined;
  restore: (recipe: MyRecipe) => void;
};

export const useMyRecipes = create<MyRecipesState>()(
  persist(
    (set, get) => ({
      recipes: {},
      save: (recipe) =>
        set((s) => {
          const now = Date.now();
          const existing = s.recipes[recipe.id];
          return { recipes: { ...s.recipes, [recipe.id]: { ...recipe, createdAt: existing?.createdAt ?? now, updatedAt: now } } };
        }),
      remove: (id) => {
        const removed = get().recipes[id];
        set((s) => {
          const { [id]: _gone, ...rest } = s.recipes;
          return { recipes: rest };
        });
        return removed;
      },
      restore: (recipe) => set((s) => ({ recipes: { ...s.recipes, [recipe.id]: recipe } })),
    }),
    { name: `${STORAGE_PREFIX}/my-recipes`, version: 1, storage: persistentStorage(), partialize: ({ recipes }) => ({ recipes }) },
  ),
);
