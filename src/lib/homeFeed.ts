// Home's ranked "from other cooks": reads every published recipe's ranking
// columns once (read only, about 600 rows, ingredients but not the method),
// then the engine (domain/home-engine) ranks them on the phone against this
// cook's cupboard, diet, avoid list, follows and logged events.
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { pantryMatchOf, type RankRow } from '@/domain/home-engine/fromPublished';
import { recommend, sectionsOf } from '@/domain/home-engine/engine';
import type { RankedItem, Viewer } from '@/domain/home-engine/types';
import { tierOf, cookable } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { containsAvoided, type DietPreference } from '@/domain/recipes/diets';
import { useCupboard } from '@/store/cupboard';
import { LOCAL_VIEWER, useHomeEvents } from '@/store/homeEvents';
import { usePreferences } from '@/store/preferences';
import { useToday } from './today';
import { fetchFollows, fetchRankRows } from './homeFeedReads';
import { useRead, type Load } from './usePublished';

const DIET_ANY_OF: Record<DietPreference, string[] | undefined> = {
  everything: undefined,
  vegetarian: ['vegetarian'],
  vegan: ['vegan'],
  pescatarian: ['vegetarian', 'pescatarian'],
};

export type Tiered = { row: RankRow; missing: string[] };

export type HomeEngine = Load<{
  feed: RankedItem[];
  sections: ReturnType<typeof sectionsOf>;
  /** Published recipes you can cook now (nothing missing), best covered first. */
  canCook: Tiered[];
  /** One or two things short, with what's missing. */
  missingFew: Tiered[];
  rows: ReadonlyMap<string, RankRow>;
}> & { retry: () => void };

export function useHomeEngine(): HomeEngine {
  const rows = useRead(fetchRankRows, 'all');
  const asCookId = useHomeEvents((s) => s.asCookId);
  const follows = useRead(fetchFollows, asCookId ?? '');
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const diet = usePreferences((s) => s.diet);
  const avoid = usePreferences((s) => s.avoid);
  const cuisines = usePreferences((s) => s.cuisines);
  const today = useToday();
  // Home doesn't reshuffle under your thumb: this visit ranks on what happened before it opened,
  // plus hides and follows, which should show straight away.
  const [openedAt] = useState(() => Date.now());
  // Impressions logged during this visit don't count yet; useShallow keeps the same array
  // (and so skips the re-rank) until something that counts arrives.
  const ranked = useHomeEvents(
    useShallow((s) => s.events.filter((e) => e.at < openedAt || e.type === 'hide' || e.type === 'follow' || e.type === 'unfollow')),
  );
  const loaded = rows.state === 'ready' ? rows.value : undefined;
  const followIds = follows.state === 'ready' ? follows.value : undefined;

  const value = useMemo(() => {
    if (!loaded) return undefined;
    const have = cupboardIds(items);
    const allowed = loaded.filter((r) => !containsAvoided({ ingredientGroups: r.groups }, avoid, INGREDIENTS));
    const byId = new Map(allowed.map((r) => [r.item.id, r]));
    const dietAnyOf = DIET_ANY_OF[diet];
    const viewer: Viewer = {
      id: LOCAL_VIEWER,
      follows: new Set(followIds ?? []),
      pantry: have,
      events: ranked,
      likedCuisines: cuisines,
      ...(dietAnyOf ? { dietAnyOf } : {}),
    };
    const feed = recommend({
      items: allowed.map((r) => r.item),
      viewer,
      now: openedAt,
      seed: today,
      pantryOf: (item) => pantryMatchOf(byId.get(item.id)?.groups ?? [], have, shelf, INGREDIENTS, KITCHEN),
      nameOf: (id) => INGREDIENTS.byId.get(id)?.name ?? id.replace(/^unknown:/, '').replace(/-/g, ' '),
    });
    const canCook: Tiered[] = [];
    const missingFew: Tiered[] = [];
    if (have.size) {
      for (const r of feed) {
        const row = byId.get(r.item.id)!;
        const tier = tierOf(cookable({ ingredientGroups: row.groups }, have, shelf, INGREDIENTS, KITCHEN));
        if (tier === 'ready') canCook.push({ row, missing: [] });
        else if (tier === 'nearly') missingFew.push({ row, missing: [...r.pantry.missing] });
      }
    }
    return { feed, sections: sectionsOf(feed), canCook, missingFew, rows: byId };
  }, [loaded, followIds, items, shelf, diet, avoid, cuisines, ranked, today, openedAt]);

  if (rows.state === 'loading') return { state: 'loading', retry: rows.retry };
  if (rows.state === 'error') return { state: 'error', problem: rows.problem, retry: rows.retry };
  return { state: 'ready', value: value!, retry: rows.retry };
}
