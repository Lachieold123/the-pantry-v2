// The numbers on the tab bar and in the drawer, each read from its own store.
import { toISODate, upcomingCount } from '@/domain/plan/week';
import { useMyRecipes } from '@/store/myRecipes';
import { usePlan } from '@/store/plan';
import { useSaved } from '@/store/saved';

export function usePlanBadge(): number {
  // Today's date is read on render; the tab bar re-renders on every tab change, which is often enough.
  const today = toISODate(new Date());
  return usePlan((s) => upcomingCount(s.entries, today));
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
