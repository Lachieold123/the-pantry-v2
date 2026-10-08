// The delete panel (REL-15): disabled until DELETE is typed, shows a failure,
// and cancel resets it. A household-only phone gets it too, as "Delete my household data".
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAccount } from '@/store/account';
import { useHousehold } from '@/store/household';
import { DeleteAccount } from './DeleteAccount';

const mockRouter = { dismissTo: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
const mockDeleteAccount = jest.fn();
jest.mock('@/store/accountActions', () => ({ deleteAccount: () => mockDeleteAccount() }));
const mockDeleteHousehold = jest.fn();
jest.mock('@/store/household', () => {
  const actual = jest.requireActual('@/store/household');
  return { ...actual, deleteHouseholdData: () => mockDeleteHousehold() };
});

const who = { id: 'u1', email: 'sam@example.com', apple: false, name: 'Sam' };

beforeEach(() => {
  jest.clearAllMocks();
  useAccount.setState({ who: undefined });
  useHousehold.setState({ userId: undefined });
});

it('shows nothing for a phone with no account and no household user', async () => {
  await render(<DeleteAccount />);
  expect(screen.queryByTestId('settings-delete-account')).toBeNull();
});

it('asks for DELETE, shows a failure, and cancel resets', async () => {
  useAccount.setState({ who });
  mockDeleteAccount.mockResolvedValue({ ok: false, problem: 'offline' });
  await render(<DeleteAccount />);
  await fireEvent.press(screen.getByTestId('settings-delete-account'));
  expect(screen.getByTestId('settings-delete-confirm')).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId('settings-delete-confirm-field'), 'delete');
  expect(screen.getByTestId('settings-delete-confirm')).toBeEnabled();
  await fireEvent.press(screen.getByTestId('settings-delete-confirm'));
  expect(await screen.findByTestId('settings-delete-problem')).toHaveTextContent('You’re offline. Try again when you’re back online.');
  await fireEvent.press(screen.getByTestId('settings-delete-cancel'));
  expect(screen.queryByTestId('settings-delete-panel')).toBeNull();
  await fireEvent.press(screen.getByTestId('settings-delete-account'));
  expect(screen.getByTestId('settings-delete-confirm')).toBeDisabled();
});

it('lets a household-only phone delete its data on the server', async () => {
  useHousehold.setState({ userId: 'anon-1' });
  mockDeleteHousehold.mockResolvedValue({ ok: true, value: null });
  await render(<DeleteAccount />);
  await fireEvent.press(screen.getByText('Delete my household data'));
  await fireEvent.changeText(screen.getByTestId('settings-delete-confirm-field'), 'DELETE');
  await fireEvent.press(screen.getByTestId('settings-delete-confirm'));
  expect(mockDeleteHousehold).toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalledWith({ message: 'Deleted. Your plan, list and cupboard stay on this phone.' });
});
