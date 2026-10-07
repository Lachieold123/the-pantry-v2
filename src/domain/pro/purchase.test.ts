import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FREE } from './pro';
import {
  dayLabel,
  entitlementFrom,
  planIdOf,
  plansFrom,
  proStatus,
  purchaseMessage,
  purchaseProblem,
  trialDaysOf,
  type StorePackage,
} from './purchase';

const pkg = (
  identifier: string,
  packageType: string,
  priceString: string,
  introPrice: StorePackage['product']['introPrice'] = null,
): StorePackage => ({
  identifier,
  packageType,
  product: { priceString, introPrice },
});
const week = { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7, cycles: 1 };

describe('plans from the store', () => {
  it('reads the standard packages, yearly first, with the store’s own prices', () => {
    const plans = plansFrom([pkg('$rc_monthly', 'MONTHLY', 'A$4.99'), pkg('$rc_annual', 'ANNUAL', 'A$44.99', week)]);
    assert.deepEqual(plans, [
      { id: 'yearly', price: 'A$44.99', period: 'a year', trialDays: 7 },
      { id: 'monthly', price: 'A$4.99', period: 'a month', trialDays: undefined },
    ]);
  });
  it('ignores packages that aren’t monthly or yearly, and duplicates', () => {
    const plans = plansFrom([
      pkg('$rc_lifetime', 'LIFETIME', 'A$99'),
      pkg('$rc_monthly', 'MONTHLY', 'A$4.99'),
      pkg('custom', 'MONTHLY', 'A$9'),
    ]);
    assert.deepEqual(
      plans.map((p) => p.price),
      ['A$4.99'],
    );
    assert.equal(planIdOf({ identifier: 'x', packageType: 'WEEKLY' }), undefined);
  });
  it('an empty offering has no plans', () => {
    assert.deepEqual(plansFrom([]), []);
  });
});

describe('trial length', () => {
  it('comes from the store’s free introductory offer', () => {
    assert.equal(trialDaysOf(week), 7);
    assert.equal(trialDaysOf({ price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 }), 7);
    assert.equal(trialDaysOf({ price: 0, periodUnit: 'week', periodNumberOfUnits: 2, cycles: 1 }), 14);
  });
  it('is never claimed for a paid introductory price, or when there’s no offer', () => {
    assert.equal(trialDaysOf({ price: 0.99, periodUnit: 'MONTH', periodNumberOfUnits: 1, cycles: 3 }), undefined);
    assert.equal(trialDaysOf(null), undefined);
    assert.equal(trialDaysOf({ price: 0, periodUnit: 'FORTNIGHT', periodNumberOfUnits: 1, cycles: 1 }), undefined);
  });
});

describe('who is Pro', () => {
  const entitlement = {
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    expirationDateMillis: 2e12,
    productIdentifier: 'thepantry_pro_yearly',
  };
  it('reads only the active “pro” entitlement', () => {
    assert.deepEqual(entitlementFrom({ entitlements: { active: { pro: entitlement } } }), {
      isPro: true,
      expiresAt: 2e12,
      productId: 'thepantry_pro_yearly',
      inTrial: false,
      willRenew: true,
    });
    assert.deepEqual(entitlementFrom({ entitlements: { active: { other: entitlement } } }), FREE);
    assert.deepEqual(entitlementFrom({ entitlements: { active: {} } }), FREE);
  });
  it('knows a trial, a cancelled subscription and a lifetime purchase', () => {
    assert.equal(entitlementFrom({ entitlements: { active: { pro: { ...entitlement, periodType: 'TRIAL' } } } }).inTrial, true);
    assert.equal(entitlementFrom({ entitlements: { active: { pro: { ...entitlement, willRenew: false } } } }).willRenew, false);
    assert.equal(
      entitlementFrom({ entitlements: { active: { pro: { ...entitlement, expirationDateMillis: null } } } }).expiresAt,
      undefined,
    );
  });
});

describe('purchase problems', () => {
  it('sorts RevenueCat’s codes into what the paywall says', () => {
    assert.equal(purchaseProblem('1'), 'cancelled');
    assert.equal(purchaseProblem(undefined, true), 'cancelled');
    assert.equal(purchaseProblem('20'), 'pending');
    assert.equal(purchaseProblem('10'), 'offline');
    assert.equal(purchaseProblem('35'), 'offline');
    assert.equal(purchaseProblem('3'), 'not-allowed');
    assert.equal(purchaseProblem('23'), 'not-on-sale');
    assert.equal(purchaseProblem('2'), 'failed');
    assert.equal(purchaseProblem(undefined), 'failed');
  });
  it('tells the cook nothing was charged when it failed', () => {
    assert.match(purchaseMessage('failed'), /Nothing has been charged/);
    assert.match(purchaseMessage('pending'), /approv/);
  });
});

describe('Settings’ status', () => {
  const now = new Date(2026, 9, 7).getTime();
  const oct14 = new Date(2026, 9, 14).getTime();
  const next = new Date(2027, 9, 7).getTime();
  it('says Free, the trial’s end, or when Pro renews or ends', () => {
    assert.equal(proStatus(FREE, false, now), 'Free');
    assert.equal(proStatus({ isPro: true, expiresAt: oct14, inTrial: true }, true, now), 'Trial ends 14 Oct');
    assert.equal(proStatus({ isPro: true, expiresAt: next, willRenew: true }, true, now), 'Pro, renews 7 Oct 2027');
    assert.equal(proStatus({ isPro: true, expiresAt: oct14, willRenew: false }, true, now), 'Pro, ends 14 Oct');
    assert.equal(proStatus({ isPro: true }, true, now), 'Pro');
  });
  it('adds the year only when it isn’t this year', () => {
    assert.equal(dayLabel(oct14, now), '14 Oct');
    assert.equal(dayLabel(next, now), '7 Oct 2027');
  });
});
