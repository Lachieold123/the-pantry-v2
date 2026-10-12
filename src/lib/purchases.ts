// Buying Pro (D-038), through RevenueCat with the existing products
// `thepantry_pro_monthly` and `thepantry_pro_yearly` (the yearly carries the
// 7-day trial as an App Store introductory offer).
//
// Not connected yet: RevenueCat's library is a new native dependency and its
// key is Lachlan's to enter (CLAUDE.md). Until then everything here answers
// honestly that buying isn't available, the paywall says Pro isn't on sale
// yet, and no free limit applies anywhere: nothing is ever locked with no way
// to pay (CLAUDE.md: no dead buttons).
//
// Connect: install react-native-purchases, configure it at launch with the
// public iOS key and an anonymous app user id, map offerings to `Plan` (below), and
// have `entitlementFrom` read the "pro" entitlement. Then set
// PURCHASES_CONNECTED to true.
import type { Entitlement } from '@/domain/pro/pro';
import type { StorePlan } from '@/domain/pro/terms';

export const PURCHASES_CONNECTED: boolean = false;

/**
 * One way to pay, as the paywall shows it (wording in domain/pro/terms).
 * Map each RevenueCat package as: price = product.priceString,
 * period = periodFromISO(product.subscriptionPeriod), and trialDays from
 * product.introPrice when its price is 0 (a free trial).
 */
export type Plan = StorePlan;

/**
 * Placeholders until RevenueCat is connected (PRO.md: US$4.99 a month,
 * US$44.99 a year with a 7-day trial). They exist to shape and test the
 * paywall, never to sell: the app only ever shows the store's own prices, so
 * nothing outside tests reads these, and loadPlans must return the store's.
 */
export const PLACEHOLDER_PLANS: readonly Plan[] = [
  { id: 'yearly', price: 'US$44.99', period: { unit: 'year', count: 1 }, trialDays: 7 },
  { id: 'monthly', price: 'US$4.99', period: { unit: 'month', count: 1 } },
];

export type PlansResult = { status: 'ok'; plans: Plan[] } | { status: 'not-connected' } | { status: 'failed'; message: string };
export type BuyResult =
  | { status: 'ok'; entitlement: Entitlement }
  | { status: 'cancelled' }
  | { status: 'not-connected' }
  | { status: 'failed'; message: string };

export async function loadPlans(): Promise<PlansResult> {
  return { status: 'not-connected' };
}

export async function buy(plan: Plan['id']): Promise<BuyResult> {
  void plan;
  return { status: 'not-connected' };
}

export async function restore(): Promise<BuyResult> {
  return { status: 'not-connected' };
}

/** Asks the store what this phone is entitled to, at launch and when the app returns to the front. */
export async function currentEntitlement(): Promise<Entitlement | undefined> {
  return undefined;
}
