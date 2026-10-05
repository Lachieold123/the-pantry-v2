// The Pantry Pro (D-038): what's free, what's Pro, and the limits between.
//
// The rule (D-003): a free user can always do the whole North Star for the
// week they're shopping for: plan it, get the list, send it, cook it with
// timers, and cook from what they have. Pro is "more", never "unlocked":
// planning further ahead, and no ceilings on the things people collect.
// Everything here is plain logic; the store decides who is Pro, and whether
// limits apply at all (only once buying Pro actually works).
import { SCAN_LIMITS } from '../cupboard/scan';
import { addDays, shoppingWeek, type ISODate } from '../plan/week';

export type ProFeature = 'plan-ahead' | 'collections' | 'my-recipes' | 'imports' | 'scans';

/** Free allowances. Scans keep their own window (calendar month) in cupboard/scan. */
export const FREE_LIMITS = {
  collections: 3,
  myRecipes: 10,
  importsPerMonth: 5,
  scansPerMonth: SCAN_LIMITS.freePerMonth,
} as const;

/** The yearly plan's introductory offer, set in App Store Connect. The paywall only says it when the store offers it. */
export const TRIAL_DAYS = 7;

/** A mirror of what RevenueCat says; RevenueCat is the truth (map §5). */
export type Entitlement = {
  isPro: boolean;
  /** Milliseconds. Absent for a lifetime purchase or while the store hasn't said. */
  expiresAt?: number | undefined;
  productId?: string | undefined;
  /** In a free trial, so the paywall and Settings can say when it ends. */
  inTrial?: boolean | undefined;
};

export const FREE: Entitlement = { isPro: false };

/** Pro, and not past its expiry. A mirror that's out of date by a day still lapses on time. */
export function isActive(e: Entitlement, now: number): boolean {
  return e.isPro && (e.expiresAt === undefined || e.expiresAt > now);
}

/**
 * The last day a free user can plan: the end of the week they're shopping
 * for. Monday to Saturday that's this Sunday; on Sunday (planning day) it's
 * the Sunday after, so "Sunday: plan the week" is always free.
 */
export function lastFreePlanDay(today: ISODate): ISODate {
  return addDays(shoppingWeek(today), 6);
}

export function planDayLocked(day: ISODate, today: ISODate): boolean {
  return day > lastFreePlanDay(today);
}

/** Link imports this calendar month. */
export function importsThisMonth(at: readonly number[], now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return at.filter((t) => t >= start).length;
}

/** Old imports can't affect this month's count; keeps the stored list short. */
export function pruneImports(at: readonly number[], now: Date): number[] {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return at.filter((t) => t >= start);
}

/** How much a free user has used of each counted allowance. */
export type Usage = { collections: number; myRecipes: number; importsThisMonth: number };

/** Would one more of this go over the free allowance? (Plan ahead and scans are checked by day and by window.) */
export function overFreeLimit(feature: Exclude<ProFeature, 'plan-ahead' | 'scans'>, usage: Usage): boolean {
  if (feature === 'collections') return usage.collections >= FREE_LIMITS.collections;
  if (feature === 'my-recipes') return usage.myRecipes >= FREE_LIMITS.myRecipes;
  return usage.importsThisMonth >= FREE_LIMITS.importsPerMonth;
}

/**
 * What the paywall lists, and only this: each line is a limit the code
 * enforces or a feature that exists (the old paywall sold things Pro didn't
 * do, map §8 #7). New Pro features join here when they ship.
 */
export const PRO_BENEFITS: readonly { feature: ProFeature; title: string; body: string }[] = [
  { feature: 'plan-ahead', title: 'Plan further ahead', body: 'Plan next week while this one’s still going, and send both lists.' },
  {
    feature: 'collections',
    title: 'Unlimited collections',
    body: `Free has ${FREE_LIMITS.collections}. Make one for every mood, guest and season.`,
  },
  {
    feature: 'my-recipes',
    title: 'Unlimited recipes of your own',
    body: `Free keeps ${FREE_LIMITS.myRecipes}. Write down every family recipe.`,
  },
  {
    feature: 'imports',
    title: 'Import as many links as you like',
    body: `Free imports ${FREE_LIMITS.importsPerMonth} a month.`,
  },
];

/** Scanning joins the list only once it works (K-14): nothing on the paywall is "coming soon". */
export function proBenefits(scanningLive: boolean): typeof PRO_BENEFITS {
  if (!scanningLive) return PRO_BENEFITS;
  return [
    ...PRO_BENEFITS,
    {
      feature: 'scans',
      title: 'Scan as often as you shop',
      body: `Free scans ${FREE_LIMITS.scansPerMonth} receipts or shelves a month. Pro scans every shop.`,
    },
  ];
}

/** The paywall's opening line says why it opened: the thing you just tried to do. */
export function paywallHeading(from: ProFeature | undefined): { title: string; body: string } {
  switch (from) {
    case 'plan-ahead':
      return { title: 'Plan further ahead', body: 'Free plans up to the end of the week you’re shopping for. Pro plans next week too.' };
    case 'collections':
      return {
        title: 'More collections',
        body: `You’ve made ${FREE_LIMITS.collections}, the free limit. Pro has no limit, and your collections stay yours either way.`,
      };
    case 'my-recipes':
      return {
        title: 'More of your own recipes',
        body: `You’ve saved ${FREE_LIMITS.myRecipes}, the free limit. Pro has no limit, and every recipe stays yours either way.`,
      };
    case 'imports':
      return {
        title: 'More imports',
        body: `You’ve imported ${FREE_LIMITS.importsPerMonth} links this month. Pro imports as many as you like.`,
      };
    case 'scans':
      return { title: 'More scans', body: `You’ve used this month’s ${FREE_LIMITS.scansPerMonth} free scans. Pro scans every shop.` };
    default:
      return { title: 'The Pantry Pro', body: 'Everything free stays free. Pro is for planning further ahead and keeping more.' };
  }
}

export function isProFeature(value: unknown): value is ProFeature {
  return value === 'plan-ahead' || value === 'collections' || value === 'my-recipes' || value === 'imports' || value === 'scans';
}
