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
      { id: 'monthly', price: 'A$7.99', period: { unit: 'month', count: 1 } },
      { id: 'yearly', price: 'A$69.99', period: { unit: 'year', count: 1 }, trialDays: 7 },
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
    // No prices until the store gives real ones: placeholders are never shown.
    expect(screen.queryByText(/US\$|A\$/)).toBeNull();
    // Scanning isn't live, so it isn't sold.
    expect(screen.queryByText('Scan as often as you shop')).toBeNull();
  });

  it('once buying works, leads with yearly and its trial, and a purchase makes you Pro', async () => {
    mockStore.connected = true;
    await render(<PaywallScreen from="plan-ahead" />);
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
    expect(screen.getByText('7 days free, then A$69.99 a year')).toBeTruthy();
    expect(screen.getByText('Start 7-day free trial')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pro-buy'));
    await waitFor(() => expect(usePro.getState().entitlement.isPro).toBe(true));
    expect(mockToast).toHaveBeenCalledWith({ message: 'Welcome to Pro' });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows each plan’s length beside its price, and what the trial costs once it ends (3.1.2)', async () => {
    mockStore.connected = true;
    await render(<PaywallScreen from={undefined} />);
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
    expect(screen.getByTestId('pro-plan-yearly-price')).toHaveTextContent('A$69.99 for 1 year');
    expect(screen.getByTestId('pro-plan-monthly-price')).toHaveTextContent('A$7.99 for 1 month');
    expect(screen.getByText('Renews every month')).toBeTruthy();
    expect(screen.getByTestId('pro-plan-yearly').props.accessibilityLabel).toBe(
      'Yearly, A$69.99 for 1 year. 7 days free, then A$69.99 a year.',
    );
    // Without a trial, the button doesn't promise one.
    await fireEvent.press(screen.getByTestId('pro-plan-monthly'));
    expect(screen.getByText('Subscribe')).toBeTruthy();
    expect(screen.queryByText('Start 7-day free trial')).toBeNull();
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
