import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules, Platform } from 'react-native';

import { FREE } from '@/domain/pro/pro';
import { customer, mockPurchases, offerings, storeError, storePackage, type MockPurchases } from '@/lib/purchases.testing';
import { useAccount } from './account';
import { useLimitsApply, usePro, usePurchasesReady } from './pro';
import { checkSale, purchasePro, restorePro, startPurchases, stopPurchases } from './proSync';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-purchases', () => require('@/lib/purchases.testing').revenueCatModule());

const YEAR_AHEAD = Date.now() + 365 * 864e5;
const WEEK_AHEAD = Date.now() + 7 * 864e5;
const rc = () => mockPurchases();

beforeAll(() => {
  // A development build on an iPhone: RevenueCat's native module is there.
  NativeModules.RNPurchases = {};
});

beforeEach(() => {
  stopPurchases();
  jest.clearAllMocks();
  rc().isAnonymous.mockResolvedValue(true);
  rc().getCustomerInfo.mockResolvedValue(customer());
  rc().getOfferings.mockResolvedValue(offerings());
  usePro.setState({ entitlement: FREE, sale: { state: 'unavailable' }, previewLimits: false, pretendPro: false, importsAt: [] });
  useAccount.setState({ who: undefined, status: 'signed-out' });
});

async function started() {
  startPurchases();
  await waitFor(() => expect(usePro.getState().sale.state).not.toBe('checking'));
}

describe('starting RevenueCat', () => {
  it('configures once on an iPhone with the public key, and lists the plans yearly first with the store’s trial', async () => {
    await started();
    expect(rc().configure).toHaveBeenCalledWith({ apiKey: expect.stringMatching(/^appl_/), appUserID: null });
    expect(usePro.getState().sale).toEqual({
      state: 'on-sale',
      plans: [
        { id: 'yearly', price: 'A$44.99', period: 'a year', trialDays: 7 },
        { id: 'monthly', price: 'A$4.99', period: 'a month', trialDays: undefined },
      ],
    });
  });

  it('uses the signed-in account as the app user id at launch', async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const account = require('./account') as typeof import('./account');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sync = require('./proSync') as typeof import('./proSync');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const purchases = (require('react-native-purchases') as { default: MockPurchases }).default;
      purchases.getOfferings.mockResolvedValue(offerings());
      purchases.getCustomerInfo.mockResolvedValue(customer());
      account.useAccount.setState({ who: { id: 'user-1', email: 'a@b.co', apple: false, name: undefined }, status: 'signed-in' });
      sync.startPurchases();
      expect(purchases.configure).toHaveBeenCalledWith({ apiKey: expect.stringMatching(/^appl_/), appUserID: 'user-1' });
      sync.stopPurchases();
    });
  });

  it('keeps the trial line out when the store reports no trial', async () => {
    rc().getOfferings.mockResolvedValue(offerings([storePackage('$rc_annual', 'A$44.99'), storePackage('$rc_monthly', 'A$4.99')]));
    await started();
    const sale = usePro.getState().sale;
    expect(sale.state === 'on-sale' && sale.plans[0]?.trialDays).toBeUndefined();
  });

  it('refreshes who is Pro from the store, and follows renewals and approvals as they arrive', async () => {
    rc().getCustomerInfo.mockResolvedValue(customer({ expires: YEAR_AHEAD }));
    await started();
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(true));
    const listener = rc().addCustomerInfoUpdateListener.mock.calls.at(-1)?.[0] as (info: unknown) => void;
    listener(customer());
    expect(usePro.getState().entitlement).toEqual({ isPro: false });
  });
});

describe('when nothing is on sale (today: products not approved yet)', () => {
  it('an empty offering means not on sale, and no free limit applies', async () => {
    rc().getOfferings.mockResolvedValue(offerings([]));
    await started();
    expect(usePro.getState().sale).toEqual({ state: 'not-on-sale' });
    const { result } = await renderHook(() => ({ ready: usePurchasesReady(), limits: useLimitsApply() }));
    expect(result.current).toEqual({ ready: false, limits: false });
  });

  it('RevenueCat’s “no products could be fetched” error is also not on sale, not an outage', async () => {
    rc().getOfferings.mockRejectedValue(storeError('23'));
    await started();
    expect(usePro.getState().sale).toEqual({ state: 'not-on-sale' });
  });

  it('an unreachable store is a failure the paywall can retry, and limits still don’t apply', async () => {
    rc().getOfferings.mockRejectedValueOnce(storeError('10'));
    await started();
    expect(usePro.getState().sale.state).toBe('failed');
    const { result } = await renderHook(() => useLimitsApply());
    expect(result.current).toBe(false);
    await act(() => checkSale());
    expect(usePro.getState().sale.state).toBe('on-sale');
  });

  it('once on sale, limits apply to a free user', async () => {
    await started();
    const { result } = await renderHook(() => useLimitsApply());
    expect(result.current).toBe(true);
  });
});

describe('buying and restoring', () => {
  beforeEach(started);

  it('a purchase makes this phone Pro, with the trial and its end date', async () => {
    rc().purchasePackage.mockResolvedValue({ customerInfo: customer({ expires: WEEK_AHEAD, trial: true }) });
    expect(await purchasePro('yearly')).toEqual({ kind: 'pro' });
    expect(rc().purchasePackage.mock.calls[0]?.[0]).toMatchObject({ identifier: '$rc_annual' });
    expect(usePro.getState().entitlement).toEqual({
      isPro: true,
      expiresAt: WEEK_AHEAD,
      inTrial: true,
      willRenew: true,
      productId: 'thepantry_pro_yearly',
    });
  });

  it('cancelling changes nothing and says nothing', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('1', true));
    expect(await purchasePro('monthly')).toEqual({ kind: 'cancelled' });
    expect(usePro.getState().entitlement).toEqual(FREE);
  });

  it('Ask to Buy waits for approval, without an error', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('20'));
    const o = await purchasePro('yearly');
    expect(o.kind).toBe('pending');
    expect(usePro.getState().entitlement).toEqual(FREE);
  });

  it('a store failure says nothing was charged', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('2'));
    const o = await purchasePro('yearly');
    expect(o).toEqual({ kind: 'failed', message: expect.stringContaining('Nothing has been charged') });
  });

  it('restore brings Pro back, or says nothing was found', async () => {
    rc().restorePurchases.mockResolvedValueOnce(customer({ expires: YEAR_AHEAD }));
    expect(await restorePro()).toEqual({ kind: 'pro' });
    expect(usePro.getState().entitlement.isPro).toBe(true);
    rc().restorePurchases.mockResolvedValueOnce(customer());
    expect(await restorePro()).toEqual({ kind: 'nothing-found' });
  });
});

describe('the account', () => {
  beforeEach(started);

  it('signing in ties purchases to the account; signing out goes back to anonymous', async () => {
    rc().logIn.mockResolvedValue({ customerInfo: customer({ expires: YEAR_AHEAD }), created: false });
    useAccount.setState({ who: { id: 'user-1', email: 'a@b.co', apple: false, name: undefined }, status: 'signed-in' });
    await waitFor(() => expect(rc().logIn).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(true));

    rc().isAnonymous.mockResolvedValue(false);
    rc().logOut.mockResolvedValue(customer());
    useAccount.setState({ who: undefined, status: 'signed-out' });
    await waitFor(() => expect(rc().logOut).toHaveBeenCalled());
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(false));
  });

  it('never logs out an id that’s already anonymous (RevenueCat would throw)', async () => {
    useAccount.setState({ who: { id: 'user-2', email: undefined, apple: true, name: undefined }, status: 'signed-in' });
    rc().logIn.mockResolvedValue({ customerInfo: customer(), created: true });
    await waitFor(() => expect(rc().logIn).toHaveBeenCalled());
    rc().isAnonymous.mockResolvedValue(true);
    useAccount.setState({ who: undefined, status: 'signed-out' });
    await waitFor(() => expect(rc().isAnonymous).toHaveBeenCalled());
    expect(rc().logOut).not.toHaveBeenCalled();
  });
});

describe('anywhere but an iPhone', () => {
  it('the web and Android never start RevenueCat: Pro isn’t available, and nothing is limited', async () => {
    await jest.isolateModulesAsync(async () => {
      // A fresh module registry has its own react-native, so its Platform is the one to change.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      jest.replaceProperty((require('react-native') as { Platform: typeof Platform }).Platform, 'OS', 'android');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = require('@/lib/purchases') as typeof import('@/lib/purchases');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const purchases = (require('react-native-purchases') as { default: MockPurchases }).default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const store = require('./pro') as typeof import('./pro');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sync = require('./proSync') as typeof import('./proSync');
      sync.startPurchases();
      expect(purchases.configure).not.toHaveBeenCalled();
      expect(store.usePro.getState().sale).toEqual({ state: 'unavailable' });
      expect(await lib.loadPlans()).toEqual({ status: 'not-connected' });
      expect(await lib.buy('yearly')).toEqual({ status: 'not-connected' });
    });
  });
});
