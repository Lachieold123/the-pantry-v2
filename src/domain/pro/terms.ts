// How the paywall words each plan (K-38, REL-09). App Store guideline 3.1.2
// asks that a buyer sees, before paying: what the plan is, how long each
// billing period lasts, what it costs, and, with a free trial, what they'll
// be charged once the trial ends. A surprise charge is the fastest way to a
// refund and a one-star review, so every line here says all of that plainly.
//
// Prices are the store's own strings, in the buyer's currency. The shape
// mirrors what RevenueCat hands back for a package (price string, ISO 8601
// subscription period, introductory offer), so real prices drop straight in.

export type BillingPeriod = { unit: 'month' | 'year'; count: number };

export type StorePlan = {
  id: 'monthly' | 'yearly';
  /** The store's own price string ("A$44.99"). Never hard-coded in the app. */
  price: string;
  period: BillingPeriod;
  /** Days of free trial the store offers this buyer, if any. */
  trialDays?: number | undefined;
};

export type PlanTerms = {
  /** "Yearly" */
  name: string;
  /** The billing length: "1 year", "1 month", "3 months". */
  length: string;
  /** The price beside its length: "A$44.99 for 1 year". */
  price: string;
  /** What happens next: "7 days free, then A$44.99 a year", or "Renews every year". */
  detail: string;
  /** All of it in one sentence, for VoiceOver. */
  spoken: string;
};

/** RevenueCat reports periods in ISO 8601 ("P1M", "P1Y", "P3M"). Weeks and days aren't sold here. */
export function periodFromISO(iso: string): BillingPeriod | undefined {
  const m = /^P(\d+)([MY])$/.exec(iso);
  if (!m) return undefined;
  const count = Number(m[1]);
  return count > 0 ? { unit: m[2] === 'Y' ? 'year' : 'month', count } : undefined;
}

export function periodLength({ unit, count }: BillingPeriod): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** What's charged each time it renews: "a year", "every 3 months". */
function perPeriod(period: BillingPeriod): string {
  return period.count === 1 ? `a ${period.unit}` : `every ${periodLength(period)}`;
}

export function planTerms(plan: StorePlan): PlanTerms {
  const name = plan.id === 'yearly' ? 'Yearly' : 'Monthly';
  const length = periodLength(plan.period);
  const renews = plan.period.count === 1 ? `every ${plan.period.unit}` : `every ${length}`;
  const detail = plan.trialDays
    ? `${plan.trialDays} days free, then ${plan.price} ${perPeriod(plan.period)}`
    : `Renews ${renews}`;
  return {
    name,
    length,
    price: `${plan.price} for ${length}`,
    detail,
    spoken: `${name}, ${plan.price} for ${length}. ${detail}.`,
  };
}

/** The button says what tapping it starts, so a trial is never mistaken for a charge (or the reverse). */
export function buyLabel(plan: StorePlan | undefined): string {
  return plan?.trialDays ? `Start ${plan.trialDays}-day free trial` : 'Subscribe';
}
