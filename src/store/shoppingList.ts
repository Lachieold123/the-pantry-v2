// The shopping list for one week, worked out from the plan (never stored).
// Items ticked this week stay in their aisle even after they move into the
// cupboard, so nothing jumps around mid-shop. Shared by the List tab, the
// Plan tab's list card and the tab bar's badge, so all three agree.
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { entriesInWeek, isPast, mealCount, toISODate, visibleWeeks, type ISODate } from '@/domain/plan/week';
import { countToBuy, deriveShoppingList, EMPTY_EDITS, type ShoppingList } from '@/domain/shopping/derive';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useRecipeLookup } from '@/store/recipeBook';

export function useWeekList(week: ISODate): { list: ShoppingList; meals: number } {
  const entries = usePlan((s) => s.entries);
  const edits = usePlan((s) => s.listEdits[week]) ?? EMPTY_EDITS;
  const cupboardItems = useCupboard((s) => s.items);
  const units = usePreferences((s) => s.units);
  const getRecipe = useRecipeLookup();
  return useMemo(() => {
    const today = toISODate(new Date());
    const upcoming = entriesInWeek(entries, week).filter((e) => !isPast(e.day, today));
    const checkedKeys = new Set(Object.keys(edits.checked));
    const cupboard = new Set(cupboardItems.map((i) => i.ingredientId).filter((id) => !checkedKeys.has(id)));
    const list = deriveShoppingList({ entries: upcoming, getRecipe, index: INGREDIENTS, cupboard, edits, units });
    return { list, meals: mealCount(upcoming) };
  }, [entries, week, edits, cupboardItems, units, getRecipe]);
}

/** Things left to buy this week, for the List tab's badge. */
export function useToBuyThisWeek(): number {
  const { list } = useWeekList(visibleWeeks(toISODate(new Date())).thisWeek);
  return countToBuy(list);
}
