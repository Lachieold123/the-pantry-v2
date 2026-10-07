// Home's ranking and Plan's ideas, wired to what the cook has told us and done.
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { entriesInWeek, visibleWeeks, type ISODate, type Slot } from '@/domain/plan/week';
import type { Recipe } from '@/domain/recipes/types';
import type { HomeFilters } from '@/domain/suggestions/home';
import { momentOf } from '@/domain/suggestions/moment';
import { rankHome, type HomeRanking } from '@/domain/suggestions/rank';
import { rankForSlot } from '@/domain/suggestions/slot';
import { useCookableNow } from './cookable';
import { useCookLog } from './cookLog';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useAllRecipes } from './recipeBook';
import { useSaved } from './saved';

const QUARTER_HOUR = 15 * 60 * 1000;

/**
 * Home's ranked lists (docs/HOME-RANKING.md). The clock is read to the quarter
 * hour, so the order holds between visits and only moves when the meal window
 * or the day changes, or the cook does something (cooks, saves, plans, stocks up).
 */
export function useHomeRanking(filters: HomeFilters, depth: number): HomeRanking {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const cuisines = usePreferences((s) => s.cuisines);
  const weeknight = usePreferences((s) => s.weeknight);
  const hidden = useSaved((s) => s.hidden);
  const bookmarks = useSaved((s) => s.bookmarks);
  const recentlyViewed = useSaved((s) => s.recentlyViewed);
  const entries = usePlan((s) => s.entries);
  const cookLog = useCookLog((s) => s.log);
  const recipes = useAllRecipes();
  const { ready, nearly } = useCookableNow();
  const quarter = Math.floor(new Date().getTime() / QUARTER_HOUR) * QUARTER_HOUR;
  return useMemo(() => {
    const moment = momentOf(new Date(quarter));
    return rankHome({
      recipes,
      taste: { diet, avoid, cuisines, weeknight },
      hidden: new Set(hidden),
      filters,
      history: {
        cookLog,
        bookmarks,
        recentlyViewed,
        plannedThisWeek: new Set(entriesInWeek(entries, visibleWeeks(moment.today).thisWeek).map((e) => e.recipeId)),
      },
      cupboard: [...ready, ...nearly],
      index: INGREDIENTS,
      moment,
      depth,
    });
  }, [
    recipes,
    diet,
    avoid,
    cuisines,
    weeknight,
    hidden,
    filters,
    cookLog,
    bookmarks,
    recentlyViewed,
    entries,
    ready,
    nearly,
    quarter,
    depth,
  ]);
}

/**
 * Plan's ideas for one meal (docs/HOME-RANKING.md §3.9): Home's scorer, scored
 * for that day and meal rather than for now. With no slot (a full day), the
 * ideas are dinners, since a tap then just opens the recipe.
 */
export function useSlotIdeas(day: ISODate, slot: Slot | undefined, depth: number): Recipe[] {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const cuisines = usePreferences((s) => s.cuisines);
  const weeknight = usePreferences((s) => s.weeknight);
  const hidden = useSaved((s) => s.hidden);
  const bookmarks = useSaved((s) => s.bookmarks);
  const recentlyViewed = useSaved((s) => s.recentlyViewed);
  const plan = usePlan((s) => s.entries);
  const cookLog = useCookLog((s) => s.log);
  const recipes = useAllRecipes();
  const { ready, nearly } = useCookableNow();
  // Read to the quarter hour, like Home, so the list holds still while the sheet is open.
  const quarter = Math.floor(new Date().getTime() / QUARTER_HOUR) * QUARTER_HOUR;
  return useMemo(
    () =>
      rankForSlot({
        recipes,
        taste: { diet, avoid, cuisines, weeknight },
        hidden: new Set(hidden),
        history: { cookLog, bookmarks, recentlyViewed },
        plan,
        cupboard: [...ready, ...nearly],
        index: INGREDIENTS,
        day,
        slot: slot ?? 'dinner',
        nowMs: quarter,
        depth,
      }).picks,
    [recipes, diet, avoid, cuisines, weeknight, hidden, cookLog, bookmarks, recentlyViewed, plan, ready, nearly, day, slot, quarter, depth],
  );
}
