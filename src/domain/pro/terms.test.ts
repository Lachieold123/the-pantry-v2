import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buyLabel, periodFromISO, periodLength, planTerms, type StorePlan } from './terms';

const yearly: StorePlan = { id: 'yearly', price: 'A$69.99', period: { unit: 'year', count: 1 }, trialDays: 7 };
const monthly: StorePlan = { id: 'monthly', price: 'A$7.99', period: { unit: 'month', count: 1 } };

describe('plan terms (App Store guideline 3.1.2)', () => {
  it('puts the billing length beside the price', () => {
    assert.equal(planTerms(monthly).price, 'A$7.99 for 1 month');
    assert.equal(planTerms(yearly).price, 'A$69.99 for 1 year');
  });
  it('says what a trial costs once it ends', () => {
    assert.equal(planTerms(yearly).detail, '7 days free, then A$69.99 a year');
  });
  it('without a trial, says it renews', () => {
    assert.equal(planTerms(monthly).detail, 'Renews every month');
    assert.equal(planTerms({ ...monthly, trialDays: 0 }).detail, 'Renews every month');
  });
  it('words longer periods in full', () => {
    const quarter: StorePlan = { ...monthly, period: { unit: 'month', count: 3 } };
    assert.equal(planTerms(quarter).price, 'A$7.99 for 3 months');
    assert.equal(planTerms(quarter).detail, 'Renews every 3 months');
    assert.equal(planTerms({ ...quarter, trialDays: 3 }).detail, '3 days free, then A$7.99 every 3 months');
  });
  it('reads it all aloud in one sentence', () => {
    assert.equal(planTerms(yearly).spoken, 'Yearly, A$69.99 for 1 year. 7 days free, then A$69.99 a year.');
  });
  it('labels the button for what it starts', () => {
    assert.equal(buyLabel(yearly), 'Start 7-day free trial');
    assert.equal(buyLabel(monthly), 'Subscribe');
    assert.equal(buyLabel(undefined), 'Subscribe');
  });
});

describe('store periods', () => {
  it('reads RevenueCat’s ISO 8601 periods', () => {
    assert.deepEqual(periodFromISO('P1M'), { unit: 'month', count: 1 });
    assert.deepEqual(periodFromISO('P1Y'), { unit: 'year', count: 1 });
    assert.deepEqual(periodFromISO('P6M'), { unit: 'month', count: 6 });
  });
  it('refuses periods it can’t word honestly', () => {
    assert.equal(periodFromISO('P1W'), undefined);
    assert.equal(periodFromISO('P0M'), undefined);
    assert.equal(periodFromISO(''), undefined);
  });
  it('pluralises lengths', () => {
    assert.equal(periodLength({ unit: 'year', count: 2 }), '2 years');
  });
});
