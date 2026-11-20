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

  it('signed in, names what the server set aside so it can be shortened (DATA-5)', async () => {
    const row = (kind: 'myrecipe' | 'plan', data: unknown) => ({ kind, key: kind, data, deleted: false, updatedAt: 1 });
    useAccount.setState({
      status: 'signed-in',
      who: { id: 'user-1', email: 'a@b.co', apple: false, name: undefined },
      setAside: { a: row('myrecipe', { title: 'Nan’s lasagne' }), b: row('plan', { recipeId: 'x' }) },
    });
    await render(<AccountSection />);
    expect(screen.getByText('These are too big to back up. Shorten them to keep them safe:')).toBeTruthy();
    expect(screen.getByText('• One of your recipes: “Nan’s lasagne”')).toBeTruthy();
    expect(screen.getByText('• A planned meal')).toBeTruthy();
    useAccount.setState({ setAside: {} });
  });

  it('anywhere, once email codes are connected', async () => {
    mockWays.email = true;
    await render(<AccountSection />);
    await waitFor(() => expect(screen.getByTestId('settings-account-backup')).toBeTruthy());
    expect(screen.queryByTestId('settings-account-unavailable')).toBeNull();
  });
});
