// Surprise me's state: the deck for the chosen settings, the card showing,
// and the reasons it's a good pick. Hard rules (diet, avoid list, "not for
// us") always apply; the cupboard answer comes from the shared engine, so it
// agrees with the Cupboard tab.
import { useMemo, useRef, useState } from 'react';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { hasCooked, recentlyCooked } from '@/domain/cook/cook';
import { cookable } from '@/domain/cupboard/cookable';
import { entriesInWeek, toISODate, visibleWeeks } from '@/domain/plan/week';
import { NO_FILTERS } from '@/domain/recipes/search';
import type { Recipe } from '@/domain/recipes/types';
import { DEFAULT_SPIN, spinLanding, spinPool, spinReasons, spinReel, type SpinSettings } from '@/domain/suggestions/surpriseDeck';
import { eligibleForSurprise } from '@/domain/suggestions/surprise';
import { ingredientName, useCookableNow } from '@/store/cookable';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useAllRecipes } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';

export function useSurprise() {
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const hidden = useSaved((s) => s.hidden);
  const bookmarks = useSaved((s) => s.bookmarks);
  const entries = usePlan((s) => s.entries);
  const log = useCookLog((s) => s.log);
  const shelf = useCupboard((s) => s.shelf);
  const all = useAllRecipes();
  const { ready, nearly, have } = useCookableNow();
  const [settings, setSettings] = useState<SpinSettings>(DEFAULT_SPIN);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const shown = useRef<string[]>([]);

  const eligible = useMemo(
    () => eligibleForSurprise({ recipes: all, filters: NO_FILTERS, diet, avoid, hidden: new Set(hidden), index: INGREDIENTS }),
    [all, diet, avoid, hidden],
  );
  const cookableIds = useMemo(() => new Set([...ready, ...nearly].map((m) => m.recipe.id)), [ready, nearly]);
  const pool = useMemo(() => spinPool(eligible, settings, cookableIds), [eligible, settings, cookableIds]);
  const leave = useMemo(() => {
    const week = visibleWeeks(toISODate(new Date())).thisWeek;
    return { planned: new Set(entriesInWeek(entries, week).map((e) => e.recipeId)), recentlyCooked: recentlyCooked(log) };
  }, [entries, log]);

  // The card on show: the one last landed on while it's still in the deck,
  // otherwise a random first card, so changing a setting never shows a stale
  // dish. The seed is fixed per visit, so planning it doesn't reshuffle it.
  const [seed] = useState(Math.random);
  const current = useMemo(() => pool.find((r) => r.id === currentId) ?? pool[Math.floor(seed * pool.length)], [pool, currentId, seed]);

  const reasons = useMemo(() => {
    if (!current) return [];
    return spinReasons({
      recipe: current,
      cupboard: have.size ? cookable(current, have, shelf, INGREDIENTS, KITCHEN) : undefined,
      saved: bookmarks.some((b) => b.recipeId === current.id),
      cooked: hasCooked(log, current.id),
      nameOf: ingredientName,
    });
  }, [current, have, shelf, bookmarks, log]);

  /** Decides a spin: the cards to flash past, ending on where it lands. The screen calls `land` when the animation ends. */
  const plan = (): Recipe[] | undefined => {
    const landing = spinLanding(pool, { ...leave, current: current?.id, shown: shown.current }, Math.random);
    if (!landing) return undefined;
    return spinReel(pool, current?.id, landing, Math.random);
  };
  const land = (recipe: Recipe) => {
    shown.current = [...shown.current, recipe.id];
    setCurrentId(recipe.id);
  };

  return { settings, setSettings, pool, current, reasons, plan, land, cupboardEmpty: have.size === 0 };
}
