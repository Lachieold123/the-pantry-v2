// The numbers on the tab bar and in the drawer, each read from its own store.
import { upcomingCount } from '@/domain/plan/week';
import { useToday } from '@/lib/useToday';
import { useMyRecipes } from '@/store/myRecipes';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';

export function usePlanBadge(): number {
  const today = useToday();
  const getRecipe = useRecipeLookup();
  // Entries for a recipe that's gone aren't meals, so they don't count (F17).
  return usePlan((s) =>
    upcomingCount(
      s.entries.filter((e) => getRecipe(e.recipeId) !== undefined),
      today,
    ),
  );
}

export function useDrawerCounts() {
  return {
    saved: useSaved((s) => s.bookmarks.length),
    collections: useSaved((s) => s.collections.length),
    recent: useSaved((s) => s.recentlyViewed.length),
    mine: useMyRecipes((s) => Object.keys(s.recipes).length),
    planned: usePlanBadge(),
  };
}
