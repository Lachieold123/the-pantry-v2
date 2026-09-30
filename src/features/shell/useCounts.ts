// The numbers on the tab bar and in the drawer, each read from its own store.
import { toISODate, upcomingCount } from '@/domain/plan/week';
import { useMyRecipes } from '@/store/myRecipes';
import { usePlan } from '@/store/plan';
import { useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';

export function usePlanBadge(): number {
  // Today's date is read on render; the tab bar re-renders on every tab change, which is often enough.
  const today = toISODate(new Date());
  return usePlan((s) => upcomingCount(s.entries, today));
}

export function useDrawerCounts() {
  // Counted from the recipes the lists can actually show: an old bookmark for a
  // recipe that isn't in this version (or an unfinished one of yours) isn't listed, so it isn't counted.
  const getRecipe = useRecipeLookup();
  const bookmarks = useSaved((s) => s.bookmarks);
  const recent = useSaved((s) => s.recentlyViewed);
  return {
    saved: bookmarks.filter((b) => getRecipe(b.recipeId) !== undefined).length,
    collections: useSaved((s) => s.collections.length),
    recent: recent.filter((id) => getRecipe(id) !== undefined).length,
    mine: useMyRecipes((s) => Object.keys(s.recipes).length),
    planned: usePlanBadge(),
  };
}
