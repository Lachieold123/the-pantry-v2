// Picks tonight's surprise under the cook's hard rules (diet, avoid list,
// hidden dishes) and soft ones (not already planned or recently cooked).
import { useMemo, useRef } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { recentlyCooked } from '@/domain/cook/cook';
import { entriesInWeek, toISODate, visibleWeeks } from '@/domain/plan/week';
import { NO_FILTERS, type TimeFilter } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { eligibleForSurprise, pickSurprise } from '@/domain/suggestions/surprise';
import { useCookLog } from '@/store/cookLog';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useAllRecipes } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';

export function useSurprise(time: TimeFilter | undefined) {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  const entries = usePlan((s) => s.entries);
  const log = useCookLog((s) => s.log);
  const all = useAllRecipes();
  const shown = useRef<string[]>([]);

  const input = useMemo(() => {
    const week = visibleWeeks(toISODate(new Date())).thisWeek;
    return {
      recipes: all.filter((r) => r.mealTypes.includes('dinner')),
      filters: { ...NO_FILTERS, time },
      diet,
      avoid,
      hidden: new Set(hidden),
      planned: new Set(entriesInWeek(entries, week).map((e) => e.recipeId)),
      recentlyCooked: recentlyCooked(log),
      index: INGREDIENTS,
    };
  }, [diet, avoid, hidden, entries, log, time, all]);

  const pool = useMemo(() => eligibleForSurprise(input), [input]);
  const pick = (): Recipe | undefined => {
    const recipe = pickSurprise({ ...input, alreadyShown: shown.current, random: Math.random });
    if (recipe) shown.current = [...shown.current, recipe.id];
    return recipe;
  };
  return { pool, pick };
}
