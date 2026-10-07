// Who is Pro, and whether free limits apply (D-038). The entitlement is a
// mirror of the store's answer, kept so Pro works offline and at launch;
// the store is always the truth and refreshes it.
//
// Limits apply only once Pro can actually be bought on this phone: RevenueCat
// is running (an iPhone build) and the store has a plan on sale (`sale`, set
// by ./proSync). Until then nothing is locked with no way to pay (D-038,
// D-045). Development and preview builds can preview the limits, and pretend
// to be Pro, from Settings.
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
import { proStatus } from '@/domain/pro/purchase';
import { INTERNAL_BUILD } from '@/lib/build';
import type { Plan } from '@/lib/purchases';
import { useMyRecipes } from './myRecipes';
import { useSaved } from './saved';
import { persistentStorage, STORAGE_PREFIX } from './storage';

/**
 * Whether Pro is on sale on this phone, from the last look at the store. Not
 * saved: it's asked afresh at every launch.
 * - unavailable: this device can't buy (the web, Android, Expo Go);
 * - checking: asking the store;
 * - on-sale: the plans and their prices;
 * - not-on-sale: the store has nothing to sell yet;
 * - failed: the store couldn't be reached (the paywall offers to try again).
 */
export type Sale =
  | { state: 'unavailable' }
  | { state: 'checking' }
  | { state: 'on-sale'; plans: Plan[] }
  | { state: 'not-on-sale' }
  | { state: 'failed'; message: string };

type ProState = {
  entitlement: Entitlement;
  sale: Sale;
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
      sale: { state: 'unavailable' },
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

/** Pro can be bought on this phone right now: RevenueCat is running and the store has at least one plan on sale. */
export function usePurchasesReady(): boolean {
  return usePro((s) => s.sale.state === 'on-sale');
}

/** Free limits apply: Pro can be bought here (or a development build is previewing them) and this phone isn't Pro. */
export function useLimitsApply(): boolean {
  const preview = usePro((s) => s.previewLimits);
  const onSale = usePurchasesReady();
  const pro = useIsPro();
  return !pro && (onSale || (INTERNAL_BUILD && preview));
}

/**
 * Settings' answer to "am I Pro?" (Free, Trial ends 14 Oct, Pro, renews…),
 * and whether there's a real store subscription for Apple to manage (not
 * the testing switch).
 */
export function useProStanding(): { label: string; subscribed: boolean } {
  const entitlement = usePro((s) => s.entitlement);
  const preview = usePro((s) => s.previewLimits);
  const onSale = usePurchasesReady();
  const pro = useIsPro();
  const now = new Date().getTime();
  const subscribed = isActive(entitlement, now) && entitlement.expiresAt !== undefined;
  if (subscribed) return { label: proStatus(entitlement, true, now), subscribed };
  if (pro) return { label: 'Pro', subscribed };
  return { label: onSale || (INTERNAL_BUILD && preview) ? 'Free' : 'Free, nothing limited yet', subscribed };
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
