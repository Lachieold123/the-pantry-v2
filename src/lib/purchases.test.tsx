// The paywall only says "free trial" to a buyer the store says can have one (F-4):
// someone who already used it would otherwise be charged straight away.
import { NativeModules } from 'react-native';

import { mockPurchases, offerings } from '@/lib/purchases.testing';
import { configurePurchases, loadPlans } from './purchases';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-purchases', () => require('@/lib/purchases.testing').revenueCatModule());

const rc = () => mockPurchases();
const yearlyTrial = async () => {
  const result = await loadPlans();
  return result.status === 'ok' ? result.plans.find((p) => p.id === 'yearly')?.trialDays : 'not ok';
};

beforeAll(() => {
  NativeModules.RNPurchases = {};
  configurePurchases();
});
beforeEach(() => rc().getOfferings.mockResolvedValue(offerings()));

it('asks the store about the yearly trial and offers it to an eligible buyer', async () => {
  expect(await yearlyTrial()).toBe(7);
  expect(rc().checkTrialOrIntroductoryPriceEligibility).toHaveBeenCalledWith(['thepantry_pro_yearly']);
});

it('shows no trial to a buyer who already had it', async () => {
  rc().checkTrialOrIntroductoryPriceEligibility.mockResolvedValueOnce({ thepantry_pro_yearly: { status: 1 } });
  expect(await yearlyTrial()).toBeUndefined();
});

it('shows no trial when the store cannot say', async () => {
  rc().checkTrialOrIntroductoryPriceEligibility.mockResolvedValueOnce({ thepantry_pro_yearly: { status: 0 } });
  expect(await yearlyTrial()).toBeUndefined();
  rc().checkTrialOrIntroductoryPriceEligibility.mockRejectedValueOnce(new Error('network'));
  expect(await yearlyTrial()).toBeUndefined();
});
