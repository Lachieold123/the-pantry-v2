// The shopping list for one week, worked out from the plan (never stored).
// Items ticked this week stay in their aisle even after they move into the
// cupboard, so nothing jumps around mid-shop. Shared by the List tab, the
// Plan tab's list card and the tab bar's badge, so all three agree.
import { useMemo } from 'react';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { coverFor } from '@/domain/cupboard/cookable';
import { entriesInWeek, isPast, listWeek, mealCount, visibleWeeks, type ISODate } from '@/domain/plan/week';
import { countToBuy, deriveShoppingList, EMPTY_EDITS, type ShoppingList } from '@/domain/shopping/derive';
import { useToday } from '@/lib/today';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useRecipeLookup } from '@/store/recipeBook';

export function useWeekList(week: ISODate): { list: ShoppingList; meals: number } {
  const entries = usePlan((s) => s.entries);
  const edits = usePlan((s) => s.listEdits[week]) ?? EMPTY_EDITS;
  const cupboardItems = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const units = usePreferences((s) => s.units);
  const getRecipe = useRecipeLookup();
  const today = useToday();
  return useMemo(() => {
    const upcoming = entriesInWeek(entries, week).filter((e) => !isPast(e.day, today));
    const cupboard = new Set(cupboardItems.map((i) => i.ingredientId));
    const cover = (id: string) => coverFor(id, cupboard, shelf, KITCHEN);
    const list = deriveShoppingList({ entries: upcoming, getRecipe, index: INGREDIENTS, cupboard, edits, units, cover });
    return { list, meals: mealCount(upcoming) };
  }, [entries, week, edits, cupboardItems, shelf, units, getRecipe, today]);
}

/** The week the List tab shows by default and its badge counts (see listWeek). */
export function useListWeek(): ISODate {
  const today = useToday();
  const next = visibleWeeks(today).nextWeek;
  const nextHasAnything = usePlan((s) => entriesInWeek(s.entries, next).length > 0 || (s.listEdits[next]?.extras.length ?? 0) > 0);
  return listWeek(today, nextHasAnything);
}

/** Things left to buy in the week the List tab opens on, for its badge. */
export function useToBuyThisWeek(): number {
  const { list } = useWeekList(useListWeek());
  return countToBuy(list);
}
