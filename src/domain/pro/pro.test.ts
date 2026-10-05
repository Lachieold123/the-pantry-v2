import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FREE_LIMITS,
  importsThisMonth,
  isActive,
  isProFeature,
  lastFreePlanDay,
  overFreeLimit,
  paywallHeading,
  planDayLocked,
  proBenefits,
  pruneImports,
} from './pro';

describe('planning ahead', () => {
  it('lets a free user plan to the end of this week, Monday to Saturday', () => {
    // Tuesday 6 October 2026: the week ends Sunday 11th.
    assert.equal(lastFreePlanDay('2026-10-06'), '2026-10-11');
    assert.equal(planDayLocked('2026-10-11', '2026-10-06'), false);
    assert.equal(planDayLocked('2026-10-12', '2026-10-06'), true);
  });
  it('on Sunday, the planning day, frees the whole week ahead', () => {
    assert.equal(lastFreePlanDay('2026-10-11'), '2026-10-18');
    assert.equal(planDayLocked('2026-10-18', '2026-10-11'), false);
    assert.equal(planDayLocked('2026-10-19', '2026-10-11'), true);
  });
});

describe('counted allowances', () => {
  const usage = { collections: 0, myRecipes: 0, importsThisMonth: 0 };
  it('allow up to the free limit, then ask', () => {
    assert.equal(overFreeLimit('collections', { ...usage, collections: FREE_LIMITS.collections - 1 }), false);
    assert.equal(overFreeLimit('collections', { ...usage, collections: FREE_LIMITS.collections }), true);
    assert.equal(overFreeLimit('my-recipes', { ...usage, myRecipes: FREE_LIMITS.myRecipes }), true);
    assert.equal(overFreeLimit('imports', { ...usage, importsThisMonth: FREE_LIMITS.importsPerMonth - 1 }), false);
  });
  it('count imports by calendar month', () => {
    const now = new Date(2026, 9, 6);
    const lastMonth = new Date(2026, 8, 30).getTime();
    const thisMonth = new Date(2026, 9, 2).getTime();
    assert.equal(importsThisMonth([lastMonth, thisMonth, thisMonth], now), 2);
    assert.deepEqual(pruneImports([lastMonth, thisMonth], now), [thisMonth]);
  });
});

describe('the entitlement', () => {
  it('is active while Pro and not expired; lifetime never expires', () => {
    assert.equal(isActive({ isPro: true, expiresAt: 2000 }, 1000), true);
    assert.equal(isActive({ isPro: true, expiresAt: 1000 }, 2000), false);
    assert.equal(isActive({ isPro: true }, 2000), true);
    assert.equal(isActive({ isPro: false }, 0), false);
  });
});

describe('the paywall', () => {
  it('opens on the thing you tried to do', () => {
    assert.match(paywallHeading('collections').body, /3/);
    assert.equal(paywallHeading(undefined).title, 'The Pantry Pro');
  });
  it('lists scanning only once scanning works', () => {
    assert.ok(!proBenefits(false).some((b) => b.feature === 'scans'));
    assert.ok(proBenefits(true).some((b) => b.feature === 'scans'));
  });
  it('reads a feature from a route parameter safely', () => {
    assert.equal(isProFeature('plan-ahead'), true);
    assert.equal(isProFeature('everything'), false);
  });
});
