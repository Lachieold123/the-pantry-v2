// Recipes you've written or imported, stored as the words you typed.
// The structured Recipe is derived when read (see domain/recipes/draft.ts).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RecipeDraft } from '@/domain/recipes/draft';
import type { RecipeSource } from '@/domain/recipes/types';
import { persistentStorage, savedAs } from './storage';

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
  /** Saves, or with `isNew` refuses (false) when that id is already taken, so a new recipe never overwrites another. */
  save: (recipe: Omit<MyRecipe, 'createdAt' | 'updatedAt'>, options?: { isNew?: boolean }) => boolean;
  remove: (id: string) => MyRecipe | undefined;
  restore: (recipe: MyRecipe) => void;
};

/** The recipe with this id, never something inherited from Object.prototype. */
export function ownRecipe(recipes: Record<string, MyRecipe>, id: string): MyRecipe | undefined {
  return Object.hasOwn(recipes, id) ? recipes[id] : undefined;
}

export const useMyRecipes = create<MyRecipesState>()(
  persist(
    (set, get) => ({
      recipes: {},
      save: (recipe, options) => {
        // hasOwn throughout: ids come from links, and "constructor" must not count as a recipe.
        const existing = ownRecipe(get().recipes, recipe.id);
        if (options?.isNew && existing) return false;
        const now = Date.now();
        set((s) => ({ recipes: { ...s.recipes, [recipe.id]: { ...recipe, createdAt: existing?.createdAt ?? now, updatedAt: now } } }));
        return true;
      },
      remove: (id) => {
        const removed = ownRecipe(get().recipes, id);
        if (!removed) return undefined;
        set((s) => {
          const { [id]: _gone, ...rest } = s.recipes;
          return { recipes: rest };
        });
        return removed;
      },
      restore: (recipe) => set((s) => ({ recipes: { ...s.recipes, [recipe.id]: recipe } })),
    }),
    { ...savedAs<MyRecipesState>('my-recipes', 1), storage: persistentStorage(), partialize: ({ recipes }) => ({ recipes }) },
  ),
);
