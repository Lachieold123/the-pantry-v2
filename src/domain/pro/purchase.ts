// Turning the store's answers into The Pantry's words (D-038, D-045): which
// plans are on sale and at what price, who is Pro, and what went wrong with a
// purchase. Plain logic with no packages (D-015): the shapes below are the
// few fields read from RevenueCat's objects, so a test can build them by hand
// and the domain never depends on the library.
import type { Entitlement } from './pro';

/** RevenueCat's entitlement identifier for Pro, set in its dashboard. */
export const PRO_ENTITLEMENT = 'pro';

export type PlanId = 'monthly' | 'yearly';

export type Plan = {
  id: PlanId;
  /** The store's own price string, in the buyer's currency ("A$44.99"). Never hard-coded. */
  price: string;
  /** "a month" / "a year" */
  period: string;
  /** Days of free trial the store offers this buyer, if any. Read from the store, never assumed. */
  trialDays?: number | undefined;
};

/** The fields read from a RevenueCat package (PurchasesPackage). */
export type StorePackage = {
  identifier: string;
  packageType: string;
  product: {
    priceString: string;
    introPrice: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;
  };
};

/** The fields read from RevenueCat's entitlement (PurchasesEntitlementInfo). */
export type StoreEntitlement = {
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  expirationDateMillis: number | null;
  productIdentifier: string;
};

/** The fields read from RevenueCat's CustomerInfo. */
export type StoreCustomer = { entitlements: { active: Record<string, StoreEntitlement | undefined> } };

/** Which of our plans a package is: RevenueCat's standard monthly and annual packages. */
export function planIdOf(pkg: Pick<StorePackage, 'identifier' | 'packageType'>): PlanId | undefined {
  if (pkg.identifier === '$rc_annual' || pkg.packageType === 'ANNUAL') return 'yearly';
  if (pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY') return 'monthly';
  return undefined;
}

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/**
 * The free trial in days, only when the introductory offer costs nothing.
 * A paid introductory price isn't a trial, so it's never called one.
 */
export function trialDaysOf(intro: StorePackage['product']['introPrice']): number | undefined {
  if (!intro || intro.price !== 0) return undefined;
  const unit = UNIT_DAYS[intro.periodUnit.toUpperCase()];
  if (unit === undefined || intro.periodNumberOfUnits <= 0) return undefined;
  return unit * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
}

export function planFrom(pkg: StorePackage): Plan | undefined {
  const id = planIdOf(pkg);
  if (!id) return undefined;
  return {
    id,
    price: pkg.product.priceString,
    period: id === 'yearly' ? 'a year' : 'a month',
    trialDays: trialDaysOf(pkg.product.introPrice),
  };
}

/** The plans on sale, yearly first, one of each. Anything else in the offering is ignored. */
export function plansFrom(packages: readonly StorePackage[]): Plan[] {
  const out: Plan[] = [];
  for (const pkg of packages) {
    const plan = planFrom(pkg);
    if (plan && !out.some((p) => p.id === plan.id)) out.push(plan);
  }
  return out.sort((a, b) => (a.id === b.id ? 0 : a.id === 'yearly' ? -1 : 1));
}

/** Who is Pro, from RevenueCat's answer. Only the active "pro" entitlement counts. */
export function entitlementFrom(customer: StoreCustomer): Entitlement {
  const pro = customer.entitlements.active[PRO_ENTITLEMENT];
  if (!pro || !pro.isActive) return { isPro: false };
  return {
    isPro: true,
    expiresAt: pro.expirationDateMillis ?? undefined,
    productId: pro.productIdentifier,
    inTrial: pro.periodType.toUpperCase() === 'TRIAL',
    willRenew: pro.willRenew,
  };
}

export type PurchaseProblem = 'cancelled' | 'pending' | 'offline' | 'not-allowed' | 'not-on-sale' | 'failed';

/** RevenueCat's error codes (PURCHASES_ERROR_CODE), sorted into what the paywall says. */
export function purchaseProblem(code: string | undefined, userCancelled?: boolean | null): PurchaseProblem {
  if (userCancelled || code === '1') return 'cancelled';
  if (code === '20') return 'pending';
  if (code === '10' || code === '35' || code === '32') return 'offline';
  if (code === '3') return 'not-allowed';
  if (code === '5' || code === '23') return 'not-on-sale';
  return 'failed';
}

/** What to tell the cook. Cancelling says nothing; Ask to Buy waits for a parent. */
export function purchaseMessage(problem: Exclude<PurchaseProblem, 'cancelled'>): string {
  switch (problem) {
    case 'pending':
      return 'Waiting for approval. Pro switches on as soon as the purchase is approved.';
    case 'offline':
      return 'Couldn’t reach the App Store. Check your connection and try again.';
    case 'not-allowed':
      return 'Purchases are turned off on this iPhone (Settings → Screen Time).';
    case 'not-on-sale':
      return 'Pro isn’t on sale right now. Nothing has been charged.';
    default:
      return 'The App Store couldn’t finish the purchase. Nothing has been charged. Try again in a moment.';
  }
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 Oct", or "14 Oct 2027" when it isn't this year. */
export function dayLabel(at: number, now: number): string {
  const d = new Date(at);
  const base = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Settings' one-word-or-so answer to "am I Pro?". */
export function proStatus(e: Entitlement, active: boolean, now: number): string {
  if (!active) return 'Free';
  if (e.expiresAt === undefined) return 'Pro';
  const day = dayLabel(e.expiresAt, now);
  if (e.inTrial) return `Trial ends ${day}`;
  return e.willRenew === false ? `Pro, ends ${day}` : `Pro, renews ${day}`;
}
