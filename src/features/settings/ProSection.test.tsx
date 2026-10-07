import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { FREE } from '@/domain/pro/pro';
import { usePro } from '@/store/pro';
import { MANAGE_SUBSCRIPTIONS_URL, ProSection } from './ProSection';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const YEAR_AHEAD = new Date(Date.now() + 400 * 864e5);
const plans = [{ id: 'yearly' as const, price: 'A$44.99', period: 'a year' }];

beforeEach(() => {
  jest.clearAllMocks();
  usePro.setState({ entitlement: FREE, sale: { state: 'unavailable' }, previewLimits: false, pretendPro: false, importsAt: [] });
});

const value = () => screen.getByTestId('settings-pro');

describe('Settings → The Pantry Pro', () => {
  it('while Pro isn’t on sale, says nothing is limited, with nothing to manage', async () => {
    await render(<ProSection />);
    expect(value()).toHaveTextContent(/Free, nothing limited yet/);
    expect(screen.queryByTestId('settings-manage-subscription')).toBeNull();
    await fireEvent.press(value());
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pro', params: {} });
  });

  it('once on sale, a free user is just Free', async () => {
    usePro.setState({ sale: { state: 'on-sale', plans } });
    await render(<ProSection />);
    expect(screen.getByText('Free')).toBeTruthy();
  });

  it('in a trial, says when it ends, and opens Apple’s subscriptions page', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const ends = new Date(Date.now() + 7 * 864e5);
    usePro.setState({ entitlement: { isPro: true, expiresAt: ends.getTime(), inTrial: true, willRenew: true } });
    await render(<ProSection />);
    expect(value()).toHaveTextContent(new RegExp(`Trial ends ${ends.getDate()} `));
    await fireEvent.press(screen.getByTestId('settings-manage-subscription'));
    expect(spy).toHaveBeenCalledWith(MANAGE_SUBSCRIPTIONS_URL);
  });

  it('says when Pro renews, or when a cancelled one ends', async () => {
    usePro.setState({ entitlement: { isPro: true, expiresAt: YEAR_AHEAD.getTime(), willRenew: true } });
    const { rerender } = await render(<ProSection />);
    expect(value()).toHaveTextContent(new RegExp(`Pro, renews ${YEAR_AHEAD.getDate()} .* ${YEAR_AHEAD.getFullYear()}`));
    await act(() => usePro.setState({ entitlement: { isPro: true, expiresAt: YEAR_AHEAD.getTime(), willRenew: false } }));
    await rerender(<ProSection />);
    expect(value()).toHaveTextContent(/Pro, ends /);
  });

  it('pretending to be Pro (testing builds) shows Pro, with nothing for Apple to manage', async () => {
    usePro.setState({ pretendPro: true });
    await render(<ProSection />);
    // The row's title and its value both say Pro.
    expect(screen.getAllByText('Pro')).toHaveLength(2);
    expect(screen.queryByTestId('settings-manage-subscription')).toBeNull();
  });
});
