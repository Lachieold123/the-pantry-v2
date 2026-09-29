// "Tonight, for you", wired to what the cook has told us and done.
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { recentlyCooked } from '@/domain/cook/cook';
import { entriesInWeek, toISODate, visibleWeeks } from '@/domain/plan/week';
import type { Recipe } from '@/domain/recipes/types';
import { forYou } from '@/domain/suggestions/forYou';
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
