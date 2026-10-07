import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useAccount } from '@/store/account';
import { AccountSheet } from './AccountSheet';
import { EmailSheet } from './EmailSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockLib = { apple: false, email: true, verify: { ok: false, problem: 'code-wrong' } as unknown };
const mockMe = { id: 'u1', email: 'lachlan@example.com', apple: false, name: undefined };
jest.mock('expo-apple-authentication', () => {
  const { Pressable: Press } = jest.requireActual('react-native');
  return {
    AppleAuthenticationButton: (props: { onPress: () => void; testID: string }) => <Press onPress={props.onPress} testID={props.testID} />,
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
  };
});
jest.mock('@/lib/account', () => ({
  appleAvailable: async () => mockLib.apple,
  sessionReady: async () => true,
  currentAccount: async () => ({ ok: true, value: mockMe }),
  continueWithApple: async () => ({ ok: false, problem: 'cancelled' }),
  sendEmailCode: async () => ({ ok: true, value: 'email_change' }),
  verifyEmailCode: async () => mockLib.verify,
  pullAccountRows: async () => ({ ok: true, value: [] }),
  pushAccountRows: async () => ({ ok: true, value: null }),
  listenAccount: () => () => undefined,
}));
// Email codes wait for a custom email sender (lib/emailCodes); each test says whether they're connected.
jest.mock('@/lib/emailCodes', () => ({
  get EMAIL_CODES_CONNECTED() {
    return mockLib.email;
  },
}));
jest.mock('@/lib/household', () => ({
  myHousehold: async () => ({ ok: true, value: undefined }),
  signedInUser: async () => ({ ok: true, value: 'u1' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockLib.apple = false;
  mockLib.email = true;
  mockLib.verify = { ok: false, problem: 'code-wrong' };
  useAccount.setState({ status: 'signed-out', who: undefined, code: undefined, mirror: {}, pending: {}, needsMerge: false });
});

describe('before email codes are connected', () => {
  beforeEach(() => {
    mockLib.email = false;
  });

  it('on an iPhone, offers Continue with Apple only', async () => {
    mockLib.apple = true;
    await render(<AccountSheet />);
    await waitFor(() => expect(screen.getByTestId('account-apple')).toBeTruthy());
    expect(screen.queryByTestId('account-email')).toBeNull();
    expect(screen.getByTestId('account-not-now')).toBeTruthy();
  });

  it('with no way in (the web, Android), says where backing up works and only closes', async () => {
    await render(<AccountSheet moment="household" />);
    await waitFor(() => expect(screen.getByTestId('account-unavailable')).toBeTruthy());
    expect(screen.getByText(/Backing up with your Apple ID is available on iPhone\./)).toBeTruthy();
    expect(screen.queryByTestId('account-email')).toBeNull();
    expect(screen.queryByTestId('account-apple')).toBeNull();
    await fireEvent.press(screen.getByTestId('account-done'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('an old link to the email step says it’s coming soon, with no form', async () => {
    await render(<EmailSheet />);
    expect(screen.getByText('Email sign-in is coming soon')).toBeTruthy();
    expect(screen.queryByTestId('account-email-field')).toBeNull();
    expect(screen.queryByTestId('account-send')).toBeNull();
    await fireEvent.press(screen.getByTestId('account-done'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('the sign-in sheet, with email codes connected', () => {
  it('without Sign in with Apple (the web, Android), offers email only, worded for the moment', async () => {
    await render(<AccountSheet moment="household" />);
    expect(screen.getByText('Keep your household if you change phones')).toBeTruthy();
    expect(screen.getByTestId('account-email')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('account-apple')).toBeNull());
    await fireEvent.press(screen.getByTestId('account-email'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/account/email');
  });

  it('shows Apple’s button where it works, and closing Apple’s sheet says nothing', async () => {
    mockLib.apple = true;
    await render(<AccountSheet />);
    expect(screen.getByText('Back up your kitchen')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('account-apple')).toBeTruthy());
    expect(screen.getByTestId('account-email')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-apple'));
    await waitFor(() => expect(screen.getByTestId('account-apple')).toBeTruthy());
    expect(screen.queryByTestId('account-problem')).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('Not now just closes', async () => {
    await render(<AccountSheet moment="cookmarks" />);
    await fireEvent.press(screen.getByTestId('account-not-now'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('the email and code steps', () => {
  it('sends a code, then explains a wrong one in plain words', async () => {
    await render(<EmailSheet />);
    await fireEvent.changeText(screen.getByTestId('account-email-field'), 'lachlan@example.com');
    await fireEvent.press(screen.getByTestId('account-send'));
    await waitFor(() => expect(screen.getByTestId('account-code-sent')).toBeTruthy());
    expect(screen.getByText(/lachlan@example\.com/)).toBeTruthy();
    // A new code waits a minute; Change email is there for a typo.
    expect(screen.getByText(/Send a new code in \d+s/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('account-code'), '123 456');
    await waitFor(() => expect(screen.getByTestId('account-code-problem')).toBeTruthy());
    expect(screen.getByText('That code isn’t right. Check the latest email and try again.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-change-email'));
    expect(screen.getByTestId('account-email-field')).toBeTruthy();
  });

  it('says plainly when an email can’t be right', async () => {
    await render(<EmailSheet />);
    await fireEvent.changeText(screen.getByTestId('account-email-field'), 'lachlan@');
    await fireEvent.press(screen.getByTestId('account-send'));
    expect(screen.getByTestId('account-problem')).toBeTruthy();
  });

  it('a right code signs in and closes', async () => {
    mockLib.verify = { ok: true, value: { account: mockMe, switched: false } };
    useAccount.setState({ code: { email: 'lachlan@example.com', kind: 'email_change', sentAt: Date.now() } });
    await render(<EmailSheet />);
    await fireEvent.changeText(screen.getByTestId('account-code'), '123456');
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(useAccount.getState().status).toBe('signed-in');
    expect(mockToast).toHaveBeenCalledWith({ message: 'You’re signed in. Your kitchen is backed up.' });
  });
});
