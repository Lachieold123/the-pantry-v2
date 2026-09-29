// The shopping list for one week, worked out from the plan (never stored).
// Items ticked this week stay in their aisle even after they move into the
// cupboard, so nothing jumps around mid-shop.
import { useMemo } from 'react';

import { INGREDIENTS } from '@/data/catalogue/catalogue';
import { entriesInWeek, isPast, toISODate, type ISODate } from '@/domain/plan/week';
import { deriveShoppingList, EMPTY_EDITS, type ShoppingList } from '@/domain/shopping/derive';
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
    return { list, meals: upcoming.length };
  }, [entries, week, edits, cupboardItems, units, getRecipe]);
}
