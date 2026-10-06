// The numbers and few words beside the You page's rows, each read from its own
// store. Recipe counts only count ids that still resolve to a recipe, the same
// way the library lists them, so the number always matches the page
// (health check 2026-10-05 #7).
import { PURCHASES_CONNECTED } from '@/lib/purchases';
import { useHousehold } from '@/store/household';
import { useMyRecipes } from '@/store/myRecipes';
import { useIsPro, usePro } from '@/store/pro';
import { useRecipeLookup } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';

export function useLibraryCounts() {
  const getRecipe = useRecipeLookup();
  const resolving = (ids: readonly string[]) => ids.filter((id) => getRecipe(id) !== undefined).length;
  return {
    cookmarks: resolving(useSaved((s) => s.bookmarks).map((b) => b.recipeId)),
    collections: useSaved((s) => s.collections.length),
    recent: resolving(useSaved((s) => s.recentlyViewed)),
    mine: useMyRecipes((s) => Object.keys(s.recipes).length),
  };
}

/** Who you share your kitchen with (D-039). */
export function useHouseholdValue(): string {
  const household = useHousehold((s) => s.household);
  const me = useHousehold((s) => s.userId);
  if (!household) return 'Not sharing';
  const others = household.members.filter((m) => m.userId !== me).map((m) => m.name);
  return others.length ? `With ${others.join(', ')}` : 'Just you so far';
}

/** Where you stand with Pro (D-038). Until purchases are connected, nothing is limited, and it says so. */
export function useProValue(): string {
  const pro = useIsPro();
  const inTrial = usePro((s) => s.entitlement.inTrial);
  if (pro) return inTrial ? 'Free trial' : 'Pro';
  return PURCHASES_CONNECTED ? 'Free' : 'Free, nothing limited yet';
}
