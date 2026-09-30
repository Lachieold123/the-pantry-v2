// Small helpers the library pages share: turning saved ids into recipes, a
// photo lookup, and opening a recipe.
import { useRouter } from 'expo-router';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import type { Recipe } from '@/domain/recipes/types';
import { useRecipeLookup } from '@/store/recipeBook';

/** The recipes behind a list of ids, skipping any that no longer exist (a deleted recipe of your own). */
export function useRecipesFor(): (ids: readonly string[]) => Recipe[] {
  const getRecipe = useRecipeLookup();
  return (ids) => ids.map(getRecipe).filter((r): r is Recipe => r !== undefined);
}

export function imageFor(id: string): number | undefined {
  return RECIPE_IMAGES[id];
}

export function useOpenRecipe(): (id: string) => void {
  const router = useRouter();
  return (id) => router.push({ pathname: '/recipe/[id]', params: { id } });
}

/** "1 recipe", "3 recipes": the unit every library count uses. */
export const RECIPES_UNIT = ['recipe', 'recipes'] as const;
