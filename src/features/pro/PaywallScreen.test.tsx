import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';

import { FREE } from '@/domain/pro/pro';
import { configurePurchases } from '@/lib/purchases';
import { customer, mockPurchases, offerings, storeError } from '@/lib/purchases.testing';
import { usePro } from '@/store/pro';
import { checkSale } from '@/store/proSync';
import { PaywallScreen } from './PaywallScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-purchases', () => require('@/lib/purchases.testing').revenueCatModule());

const YEAR_AHEAD = Date.now() + 365 * 864e5;
const rc = () => mockPurchases();

beforeAll(() => {
  // An iPhone build with RevenueCat's native module, so the real purchases code runs against the mock store.
  NativeModules.RNPurchases = {};
  configurePurchases();
});

beforeEach(() => {
  jest.clearAllMocks();
  rc().getOfferings.mockResolvedValue(offerings());
  usePro.setState({ entitlement: FREE, sale: { state: 'unavailable' }, pretendPro: false, previewLimits: false, importsAt: [] });
});

/** The store as the app finds it at launch: asked, and answered. */
async function onSale() {
  usePro.setState({ sale: { state: 'checking' } });
  await act(() => checkSale());
}

describe('PaywallScreen, when Pro can’t be bought', () => {
  it('on the web or Android: opens on what you tried, lists what Pro does, and says it isn’t on sale here', async () => {
    await render(<PaywallScreen from="collections" />);
    expect(screen.getByText('More collections')).toBeTruthy();
    expect(screen.getByText('Plan further ahead')).toBeTruthy();
    expect(screen.getByTestId('pro-not-on-sale')).toHaveTextContent(/isn’t on sale here yet/);
    expect(screen.queryByTestId('pro-buy')).toBeNull();
    expect(screen.queryByTestId('pro-check-again')).toBeNull();
    // Scanning isn't live, so it isn't sold.
    expect(screen.queryByText('Scan as often as you shop')).toBeNull();
  });

  it('on an iPhone whose store has nothing on sale yet (today): says so, nothing to buy, and can check again', async () => {
    rc().getOfferings.mockResolvedValue(offerings([]));
    await onSale();
    await render(<PaywallScreen from="plan-ahead" />);
    expect(screen.getByTestId('pro-not-on-sale')).toHaveTextContent('Pro isn’t on sale yet. Until it is, nothing in the app is limited.');
    expect(screen.queryByTestId('pro-buy')).toBeNull();
    rc().getOfferings.mockResolvedValue(offerings());
    await fireEvent.press(screen.getByTestId('pro-check-again'));
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
  });

  it('while asking the store, shows a busy button', async () => {
    usePro.setState({ sale: { state: 'checking' } });
    await render(<PaywallScreen />);
    expect(screen.getByTestId('pro-loading')).toBeTruthy();
  });

  it('when the store can’t be reached, says so and tries again', async () => {
    rc().getOfferings.mockRejectedValueOnce(storeError('10'));
    await onSale();
    await render(<PaywallScreen />);
    expect(screen.getByTestId('pro-load-failed')).toHaveTextContent(/Couldn’t reach the App Store/);
    await fireEvent.press(screen.getByTestId('pro-retry'));
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
  });
});

describe('PaywallScreen, on sale', () => {
  beforeEach(onSale);

  it('leads with yearly and the store’s trial, shows Apple’s renewal terms and Restore', async () => {
    await render(<PaywallScreen from="plan-ahead" />);
    expect(screen.getByText('7 days free, then A$44.99 a year')).toBeTruthy();
    expect(screen.getByText('A$4.99 a month')).toBeTruthy();
    expect(screen.getByTestId('pro-buy')).toHaveTextContent('Start free trial');
    expect(screen.getByTestId('pro-terms')).toHaveTextContent(/renews automatically unless you cancel at least 24 hours before/);
    expect(screen.getByTestId('pro-terms')).toHaveTextContent(/free trial turns into a paid subscription/);
    expect(screen.getByTestId('pro-restore')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pro-plan-monthly'));
    expect(screen.getByTestId('pro-buy')).toHaveTextContent('Continue');
    expect(screen.getByTestId('pro-terms')).not.toHaveTextContent(/free trial/);
  });

  it('a purchase makes you Pro, says welcome and closes', async () => {
    rc().purchasePackage.mockResolvedValue({ customerInfo: customer({ expires: YEAR_AHEAD, trial: true }) });
    await render(<PaywallScreen from="plan-ahead" />);
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(true));
    expect(rc().purchasePackage.mock.calls[0]?.[0]).toMatchObject({ identifier: '$rc_annual' });
    expect(mockToast).toHaveBeenCalledWith({ message: 'Welcome to Pro' });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('cancelling in Apple’s sheet changes nothing and says nothing', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('1', true));
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeEnabled());
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pro-error')).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('Ask to Buy says it’s waiting for approval', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('20'));
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(screen.getByTestId('pro-pending')).toHaveTextContent(/Waiting for approval/));
    expect(usePro.getState().entitlement).toEqual(FREE);
  });

  it('a failed purchase says so in place', async () => {
    rc().purchasePackage.mockRejectedValue(storeError('2'));
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(screen.getByTestId('pro-error')).toHaveTextContent(/Nothing has been charged/));
  });

  it('says so when a restore finds nothing, and stays open', async () => {
    rc().restorePurchases.mockResolvedValue(customer());
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByTestId('pro-restore'));
    await waitFor(() => expect(screen.getByTestId('pro-error')).toHaveTextContent('No Pro purchase found for this Apple ID.'));
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('a restore that finds Pro says so and closes', async () => {
    rc().restorePurchases.mockResolvedValue(customer({ expires: YEAR_AHEAD }));
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByTestId('pro-restore'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ message: 'Pro restored' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('PaywallScreen, when you’re Pro', () => {
  it('says when the trial ends instead of selling', async () => {
    usePro.setState({ entitlement: { isPro: true, expiresAt: YEAR_AHEAD, inTrial: true } });
    await render(<PaywallScreen from="collections" />);
    expect(screen.getByText('You’re Pro')).toBeTruthy();
    expect(screen.getByText(/Your free trial ends on/)).toBeTruthy();
    expect(screen.queryByTestId('pro-buy')).toBeNull();
  });

  it('says when a cancelled subscription ends', async () => {
    usePro.setState({ entitlement: { isPro: true, expiresAt: YEAR_AHEAD, willRenew: false } });
    await render(<PaywallScreen />);
    expect(screen.getByText(/Pro ends on .* It won’t renew/)).toBeTruthy();
  });
});
