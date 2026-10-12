import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planTerms } from '../domain/pro/terms';
import { loadPlans, PLACEHOLDER_PLANS, PURCHASES_CONNECTED } from './purchases';

describe('purchases before RevenueCat is connected', () => {
  it('offers no plans, so the paywall stays “not on sale yet” (K-25)', async () => {
    assert.equal(PURCHASES_CONNECTED, false);
    assert.deepEqual(await loadPlans(), { status: 'not-connected' });
  });
  it('keeps placeholders in the store’s shape, so real prices drop in', () => {
    assert.deepEqual(
      PLACEHOLDER_PLANS.map((p) => [planTerms(p).price, planTerms(p).detail]),
      [
        ['US$44.99 for 1 year', '7 days free, then US$44.99 a year'],
        ['US$4.99 for 1 month', 'Renews every month'],
      ],
    );
  });
});
