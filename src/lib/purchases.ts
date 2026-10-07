// Buying Pro (D-038, D-045), through RevenueCat with the products
// `thepantry_pro_monthly` and `thepantry_pro_yearly` in the offering's
// standard `$rc_monthly` and `$rc_annual` packages. The yearly carries the
// free trial as an App Store introductory offer; its length is read from the
// store, never assumed here.
//
// Only on an iPhone build with RevenueCat's native module. The web, Android
// (no app yet) and Expo Go answer "not available here", so nothing is ever
// faked: RevenueCat's own Expo Go and web "preview" modes are never used.
//
// Like lib/household, every call answers with a result and never throws. The
// store (store/proSync) decides what the answers mean for the app.
import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import type { Entitlement } from '@/domain/pro/pro';
import {
  entitlementFrom,
  planIdOf,
  plansFrom,
  purchaseMessage,
  purchaseProblem,
  type Plan,
  type PlanId,
  type StoreCustomer,
} from '@/domain/pro/purchase';

export type { Plan, PlanId } from '@/domain/pro/purchase';

/**
 * RevenueCat's public iOS SDK key. Public keys are made to ship inside the
 * app: on its own it can only read offerings and make purchases through
 * Apple, never grant Pro or read other customers (the secret key stays in
 * RevenueCat's dashboard and is never in this code).
 */
export const REVENUECAT_IOS_KEY = 'appl_kxgfhlcucbVbPCtnAHxWFZMbxJQ';

export type PlansResult =
  | { status: 'ok'; plans: Plan[] }
  /** This device can't buy at all: the web, Android, Expo Go. */
  | { status: 'not-connected' }
  /** Connected, but the store has nothing on sale (products not approved yet, or the agreement isn't active). */
  | { status: 'not-on-sale' }
  | { status: 'failed'; message: string };

export type BuyResult =
  | { status: 'ok'; entitlement: Entitlement }
  | { status: 'cancelled' }
  /** Ask to Buy: a parent has to approve it. The listener switches Pro on if they do. */
  | { status: 'pending'; message: string }
  | { status: 'not-connected' }
  | { status: 'failed'; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false };

let configured = false;
/** The offering's packages, kept from the last load so buying uses exactly what was shown. */
let packages: Partial<Record<PlanId, PurchasesPackage>> = {};

const toEntitlement = (info: CustomerInfo): Entitlement => entitlementFrom(info as unknown as StoreCustomer);

type StoreError = { code?: string; userCancelled?: boolean | null; message?: string };
const asError = (e: unknown): StoreError => (typeof e === 'object' && e !== null ? (e as StoreError) : {});

/** Whether this device can buy Pro at all. */
export function purchasesSupported(): boolean {
  return Platform.OS === 'ios' && NativeModules.RNPurchases != null;
}

export function purchasesConfigured(): boolean {
  return configured;
}

/**
 * Starts RevenueCat once, at launch. A signed-in account is its app user id
 * (so Pro follows the account to a new phone); otherwise RevenueCat keeps an
 * anonymous id of its own. Returns whether buying is possible here.
 */
export function configurePurchases(appUserId?: string): boolean {
  if (configured) return true;
  if (!purchasesSupported()) return false;
  try {
    // Quiet in a store build: only real errors reach the device log.
    void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR).catch(() => undefined);
    Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: appUserId ?? null });
    configured = true;
  } catch (e) {
    console.warn('[purchases] RevenueCat could not start', e);
  }
  return configured;
}

/** The plans on sale in the current offering, with the store's prices and any free trial. */
export async function loadPlans(): Promise<PlansResult> {
  if (!configured) return { status: 'not-connected' };
  try {
    const offerings = await Purchases.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    packages = {};
    for (const pkg of available) {
      const id = planIdOf(pkg);
      if (id && !packages[id]) packages[id] = pkg;
    }
    const plans = plansFrom(available);
    return plans.length ? { status: 'ok', plans } : { status: 'not-on-sale' };
  } catch (e) {
    // RevenueCat answers "configuration" when none of the products can be fetched from Apple yet.
    const problem = purchaseProblem(asError(e).code);
    if (problem === 'not-on-sale') return { status: 'not-on-sale' };
    return { status: 'failed', message: purchaseMessage(problem === 'offline' ? 'offline' : 'failed') };
  }
}

export async function buy(plan: PlanId): Promise<BuyResult> {
  if (!configured) return { status: 'not-connected' };
  if (!packages[plan]) await loadPlans();
  const pkg = packages[plan];
  if (!pkg) return { status: 'failed', message: purchaseMessage('not-on-sale') };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'ok', entitlement: toEntitlement(customerInfo) };
  } catch (e) {
    const err = asError(e);
    const problem = purchaseProblem(err.code, err.userCancelled);
    if (problem === 'cancelled') return { status: 'cancelled' };
    if (problem === 'pending') return { status: 'pending', message: purchaseMessage('pending') };
    return { status: 'failed', message: purchaseMessage(problem) };
  }
}

/** Restore purchases (an App Store requirement): asks Apple what this Apple ID has bought. */
export async function restore(): Promise<BuyResult> {
  if (!configured) return { status: 'not-connected' };
  try {
    return { status: 'ok', entitlement: toEntitlement(await Purchases.restorePurchases()) };
  } catch (e) {
    const problem = purchaseProblem(asError(e).code);
    return { status: 'failed', message: purchaseMessage(problem === 'cancelled' || problem === 'pending' ? 'failed' : problem) };
  }
}

/** Asks the store what this phone is entitled to. Undefined when it can't say (offline, or not connected). */
export async function currentEntitlement(): Promise<Entitlement | undefined> {
  if (!configured) return undefined;
  try {
    return toEntitlement(await Purchases.getCustomerInfo());
  } catch {
    return undefined;
  }
}

/** Calls back whenever RevenueCat learns something new (a renewal, an approved Ask to Buy, a refund). Returns a stop function. */
export function onEntitlementChange(listener: (e: Entitlement) => void): () => void {
  if (!configured) return () => undefined;
  const handler = (info: CustomerInfo) => listener(toEntitlement(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(handler);
  };
}

/** Ties purchases to the signed-in account (its Supabase user id), so Pro follows it to another phone. */
export async function identify(userId: string): Promise<Result<Entitlement>> {
  if (!configured) return { ok: false };
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return { ok: true, value: toEntitlement(customerInfo) };
  } catch {
    return { ok: false };
  }
}

/** Back to an anonymous RevenueCat id on sign-out. Logging out an anonymous id is an error, so it's skipped. */
export async function forget(): Promise<Result<Entitlement>> {
  if (!configured) return { ok: false };
  try {
    if (await Purchases.isAnonymous()) return { ok: true, value: toEntitlement(await Purchases.getCustomerInfo()) };
    return { ok: true, value: toEntitlement(await Purchases.logOut()) };
  } catch {
    return { ok: false };
  }
}
