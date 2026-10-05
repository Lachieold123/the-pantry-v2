import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FREE } from '@/domain/pro/pro';
import { usePro } from '@/store/pro';
import { PaywallScreen } from './PaywallScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// Buying is switched per test: off (today) or on (once RevenueCat is in).
const mockStore = { connected: false };
const mockYear = Date.now() + 365 * 864e5;
jest.mock('@/lib/purchases', () => ({
  get PURCHASES_CONNECTED() {
    return mockStore.connected;
  },
  loadPlans: async () => ({
    status: 'ok',
    plans: [
      { id: 'monthly', price: 'A$7.99', period: 'a month' },
      { id: 'yearly', price: 'A$69.99', period: 'a year', trialDays: 7 },
    ],
  }),
  buy: async () => ({ status: 'ok', entitlement: { isPro: true, expiresAt: mockYear, inTrial: true, productId: 'thepantry_pro_yearly' } }),
  restore: async () => ({ status: 'ok', entitlement: { isPro: false } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.connected = false;
  usePro.setState({ entitlement: FREE, pretendPro: false, previewLimits: false, importsAt: [] });
});

describe('PaywallScreen', () => {
  it('opens on what you tried, lists what Pro does, and says plainly it isn’t on sale yet', async () => {
    await render(<PaywallScreen from="collections" />);
    expect(screen.getByText('More collections')).toBeTruthy();
    expect(screen.getByText('Plan further ahead')).toBeTruthy();
    expect(screen.getByTestId('pro-not-on-sale')).toBeTruthy();
    expect(screen.queryByTestId('pro-buy')).toBeNull();
    // Scanning isn't live, so it isn't sold.
    expect(screen.queryByText('Scan as often as you shop')).toBeNull();
  });

  it('once buying works, leads with yearly and its trial, and a purchase makes you Pro', async () => {
    mockStore.connected = true;
    await render(<PaywallScreen from="plan-ahead" />);
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
    expect(screen.getByText('7 days free, then A$69.99 a year')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(true));
    expect(mockToast).toHaveBeenCalledWith({ message: 'Welcome to Pro' });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('says so when a restore finds nothing, and stays open', async () => {
    mockStore.connected = true;
    await render(<PaywallScreen from={undefined} />);
    await waitFor(() => expect(screen.getByTestId('pro-restore')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('pro-restore'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ message: 'No Pro purchase found for this Apple ID.' }));
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('when you’re Pro, says when the trial ends instead of selling', async () => {
    usePro.setState({ entitlement: { isPro: true, expiresAt: mockYear, inTrial: true } });
    await render(<PaywallScreen from="collections" />);
    expect(screen.getByText('You’re Pro')).toBeTruthy();
    expect(screen.getByText(/Your free trial ends on/)).toBeTruthy();
  });
});
