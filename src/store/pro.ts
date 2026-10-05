// Who is Pro, and whether free limits apply (D-038). The entitlement is a
// mirror of the store's answer, kept so Pro works offline and at launch;
// the store is always the truth and refreshes it.
//
// Limits apply only once Pro can be bought (PURCHASES_CONNECTED). Development
// and preview builds can preview them, and pretend to be Pro, from Settings.
import { useRouter } from 'expo-router';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { toISODate, type ISODate } from '@/domain/plan/week';
import {
  FREE,
  importsThisMonth,
  isActive,
  overFreeLimit,
  planDayLocked,
  pruneImports,
  type Entitlement,
  type ProFeature,
} from '@/domain/pro/pro';
import { INTERNAL_BUILD } from '@/lib/build';
import { currentEntitlement, PURCHASES_CONNECTED } from '@/lib/purchases';
import { useMyRecipes } from './myRecipes';
import { useSaved } from './saved';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type ProState = {
  entitlement: Entitlement;
  /** Times of link imports, for the free monthly allowance. */
  importsAt: number[];
  /** Development and preview builds only: apply the free limits before buying works. */
  previewLimits: boolean;
  /** Development and preview builds only: act as Pro. */
  pretendPro: boolean;
  setEntitlement: (e: Entitlement) => void;
  recordImport: () => void;
  setPreviewLimits: (on: boolean) => void;
  setPretendPro: (on: boolean) => void;
};

export const usePro = create<ProState>()(
  persist(
    (set) => ({
      entitlement: FREE,
      importsAt: [],
      previewLimits: false,
      pretendPro: false,
      setEntitlement: (entitlement) => set({ entitlement }),
      recordImport: () => set((s) => ({ importsAt: [...pruneImports(s.importsAt, new Date()), Date.now()] })),
      setPreviewLimits: (previewLimits) => set({ previewLimits }),
      setPretendPro: (pretendPro) => set({ pretendPro }),
    }),
    {
      name: `${STORAGE_PREFIX}/pro`,
      version: 1,
      storage: persistentStorage(),
      partialize: ({ entitlement, importsAt, previewLimits, pretendPro }) => ({ entitlement, importsAt, previewLimits, pretendPro }),
    },
  ),
);

export function useIsPro(): boolean {
  const entitlement = usePro((s) => s.entitlement);
  const pretend = usePro((s) => s.pretendPro);
  // Read on render: an expiry passing mid-session takes effect on the next render, which is soon enough.
  return (INTERNAL_BUILD && pretend) || isActive(entitlement, new Date().getTime());
}

/** Free limits apply: buying works (or a development build is previewing them) and this phone isn't Pro. */
export function useLimitsApply(): boolean {
  const preview = usePro((s) => s.previewLimits);
  const pro = useIsPro();
  return !pro && (PURCHASES_CONNECTED || (INTERNAL_BUILD && preview));
}

/** Opens the paywall, worded for what was tried. */
export function useOpenPaywall(): (from?: ProFeature) => void {
  const router = useRouter();
  return (from) => router.push({ pathname: '/pro', params: from ? { from } : {} });
}

/**
 * A check to run before creating something counted: true means go ahead;
 * false means it would pass the free allowance, and the paywall has opened.
 */
export function useAllowance(): (feature: 'collections' | 'my-recipes' | 'imports') => boolean {
  const limits = useLimitsApply();
  const openPaywall = useOpenPaywall();
  const collections = useSaved((s) => s.collections.length);
  const myRecipes = useMyRecipes((s) => Object.keys(s.recipes).length);
  const importsAt = usePro((s) => s.importsAt);
  return (feature) => {
    if (!limits) return true;
    const usage = { collections, myRecipes, importsThisMonth: importsThisMonth(importsAt, new Date()) };
    if (!overFreeLimit(feature, usage)) return true;
    openPaywall(feature);
    return false;
  };
}

/** Whether planning this day needs Pro: it's past the week you're shopping for (D-038). */
export function useDayLocked(): (day: ISODate) => boolean {
  const limits = useLimitsApply();
  return (day) => limits && planDayLocked(day, toISODate(new Date()));
}

/** A check before planning on a day: true means go ahead; false means the paywall has opened. */
export function usePlanAhead(): (day: ISODate) => boolean {
  const locked = useDayLocked();
  const openPaywall = useOpenPaywall();
  return (day) => {
    if (!locked(day)) return true;
    openPaywall('plan-ahead');
    return false;
  };
}

/** Refreshes the mirror from the store, at launch. Quietly keeps the saved one if the store can't be reached. */
export async function refreshEntitlement(): Promise<void> {
  if (!PURCHASES_CONNECTED) return;
  try {
    const fresh = await currentEntitlement();
    if (fresh) usePro.getState().setEntitlement(fresh);
  } catch {
    // Offline or the store is down: the saved entitlement stands until next launch.
  }
}
