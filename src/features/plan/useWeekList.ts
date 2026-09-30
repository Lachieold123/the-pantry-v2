// The shopping list for one week, worked out from the plan (never stored).
// Edits are judged against the whole week, and meals already eaten are only
// hidden, so a day passing never unticks or restores anything (F11).
// Unticked extras from weeks that have ended come forward (F134).
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { entriesInWeek, isPast, toISODate, weekStart, type ISODate } from '@/domain/plan/week';
import { carriedExtras, deriveShoppingList, EMPTY_EDITS, type ShoppingList } from '@/domain/shopping/derive';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useRecipeLookup } from '@/store/recipeBook';

export function useWeekList(week: ISODate): { list: ShoppingList; meals: number } {
  const entries = usePlan((s) => s.entries);
  const allEdits = usePlan((s) => s.listEdits);
  const cupboardItems = useCupboard((s) => s.items);
  const units = usePreferences((s) => s.units);
  const getRecipe = useRecipeLookup();
  return useMemo(() => {
    const today = toISODate(new Date());
    const inWeek = entriesInWeek(entries, week);
    const list = deriveShoppingList({
      entries: inWeek,
      shownFrom: today,
      getRecipe,
      index: INGREDIENTS,
      cupboard: new Set(cupboardItems.map((i) => i.ingredientId)),
      edits: allEdits[week] ?? EMPTY_EDITS,
      units,
      carried: carriedExtras(allEdits, week, weekStart(today)),
    });
    return { list, meals: inWeek.filter((e) => !isPast(e.day, today)).length };
  }, [entries, week, allEdits, cupboardItems, units, getRecipe]);
}
