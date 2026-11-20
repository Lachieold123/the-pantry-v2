// The numbers on the tab bar and in the drawer, each read from its own store.
// Recipe counts only count ids that still resolve to a recipe, the same way
// the pages they open list them, so the number always matches the page
// (health check 2026-10-05 #7).
import { entriesWithRecipes, upcomingCount } from '@/domain/plan/week';
import { useToday } from '@/lib/today';
import { useMyRecipes } from '@/store/myRecipes';
import { useRecipeLookup } from '@/store/recipeBook';
import { usePlan } from '@/store/plan';
import { useSaved } from '@/store/saved';

export function usePlanBadge(): number {
  const today = useToday();
  const getRecipe = useRecipeLookup();
  // A gone recipe stays in the plan to be taken off, but isn't a meal (F-10).
  return usePlan((s) =>
    upcomingCount(
      entriesWithRecipes(s.entries, (id) => getRecipe(id) !== undefined),
      today,
    ),
  );
}

export function useDrawerCounts() {
  const getRecipe = useRecipeLookup();
  const resolving = (ids: readonly string[]) => ids.filter((id) => getRecipe(id) !== undefined).length;
  return {
    saved: resolving(useSaved((s) => s.bookmarks).map((b) => b.recipeId)),
    collections: useSaved((s) => s.collections.length),
    recent: resolving(useSaved((s) => s.recentlyViewed)),
    mine: useMyRecipes((s) => Object.keys(s.recipes).length),
    planned: usePlanBadge(),
  };
}
