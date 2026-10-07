// "Tonight, for you" and Home's ranking, wired to what the cook has told us and done.
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { recentlyCooked } from '@/domain/cook/cook';
import { entriesInWeek, toISODate, visibleWeeks } from '@/domain/plan/week';
import type { Recipe } from '@/domain/recipes/types';
import { forYou } from '@/domain/suggestions/forYou';
import type { HomeFilters } from '@/domain/suggestions/home';
import { momentOf } from '@/domain/suggestions/moment';
import { rankHome, type HomeRanking } from '@/domain/suggestions/rank';
import { useCookableNow } from './cookable';
import { useCookLog } from './cookLog';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useAllRecipes } from './recipeBook';
import { useSaved } from './saved';

export function useForYou(count: number): Recipe[] {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const cuisines = usePreferences((s) => s.cuisines);
  const weeknight = usePreferences((s) => s.weeknight);
  const hidden = useSaved((s) => s.hidden);
  const entries = usePlan((s) => s.entries);
  const log = useCookLog((s) => s.log);
  const recipes = useAllRecipes();
  const today = toISODate(new Date());
  return useMemo(
    () =>
      forYou({
        recipes,
        taste: { diet, avoid, cuisines, weeknight },
        hidden: new Set(hidden),
        planned: new Set(entriesInWeek(entries, visibleWeeks(today).thisWeek).map((e) => e.recipeId)),
        recentlyCooked: recentlyCooked(log),
        index: INGREDIENTS,
        // Same suggestions all day; fresh ones tomorrow.
        seed: today,
        count,
      }),
    [recipes, diet, avoid, cuisines, weeknight, hidden, entries, log, today, count],
  );
}

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
