import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useAccount } from '@/store/account';
import { AccountSection } from './AccountSection';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));

const mockWays = { apple: false, email: false };
jest.mock('@/lib/account', () => ({
  appleAvailable: async () => mockWays.apple,
  sessionReady: async () => true,
  listenAccount: () => () => undefined,
}));
jest.mock('@/lib/emailCodes', () => ({
  get EMAIL_CODES_CONNECTED() {
    return mockWays.email;
  },
}));
jest.mock('@/lib/household', () => ({
  myHousehold: async () => ({ ok: true, value: undefined }),
  signedInUser: async () => ({ ok: true, value: 'u1' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockWays.apple = false;
  mockWays.email = false;
  useAccount.setState({ status: 'signed-out', who: undefined });
});

describe('Settings → Account, signed out', () => {
  it('with no way in yet (the web, Android), says where backing up works, and nothing opens', async () => {
    await render(<AccountSection />);
    await waitFor(() => expect(screen.getByTestId('settings-account-unavailable')).toBeTruthy());
    expect(screen.getByText('Backing up with your Apple ID is available on iPhone.')).toBeTruthy();
    expect(screen.queryByTestId('settings-account-backup')).toBeNull();
    expect(screen.getByTestId('settings-account-unavailable').props.accessibilityRole).toBeUndefined();
  });

  it('on an iPhone, offers the backup and opens the sheet', async () => {
    mockWays.apple = true;
    await render(<AccountSection />);
    await fireEvent.press(screen.getByTestId('settings-account-backup'));
    expect(mockRouter.push).toHaveBeenCalledWith('/account');
    await waitFor(() => expect(screen.getByTestId('settings-account-backup')).toBeTruthy());
  });

  it('anywhere, once email codes are connected', async () => {
    mockWays.email = true;
    await render(<AccountSection />);
    await waitFor(() => expect(screen.getByTestId('settings-account-backup')).toBeTruthy());
    expect(screen.queryByTestId('settings-account-unavailable')).toBeNull();
  });
});
