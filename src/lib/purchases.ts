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
// public iOS key and an anonymous app user id, map offerings to `Plan`, and
// have `entitlementFrom` read the "pro" entitlement. Then set
// PURCHASES_CONNECTED to true.
import type { Entitlement } from '@/domain/pro/pro';

export const PURCHASES_CONNECTED: boolean = false;

export type Plan = {
  id: 'monthly' | 'yearly';
  /** The store's own price string, in the buyer's currency ("A$44.99"). Never hard-coded. */
  price: string;
  /** "a month" / "a year" */
  period: string;
  /** Days of free trial the store offers this buyer, if any. */
  trialDays?: number | undefined;
};

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
