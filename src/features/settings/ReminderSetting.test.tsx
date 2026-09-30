// The Sunday reminder switch tells the truth about the phone (audit F137) and
// doesn't snap back while the permission prompt is up (F164).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { usePreferences } from '@/store/preferences';
import { ReminderSetting } from './ReminderSetting';

let mockPermission: 'granted' | 'undetermined' | 'blocked' = 'granted';
let mockResolveReminder: (on: boolean) => void = () => {};
const mockToast = jest.fn();

jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]) }));
jest.mock('@/lib/notifications', () => ({
  notificationPermission: async () => mockPermission,
  setSundayReminder: () => new Promise<boolean>((r) => (mockResolveReminder = r)),
}));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));

const reminderSwitch = () => screen.getByTestId('settings-sunday-reminder');

beforeEach(() => {
  mockToast.mockClear();
  usePreferences.setState({ sundayReminder: false });
});

test('a reminder saved as on reads as off once the phone has blocked notifications, with a way to Settings', async () => {
  usePreferences.setState({ sundayReminder: true });
  mockPermission = 'blocked';
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  await render(<ReminderSetting />);
  expect(await screen.findByTestId('settings-open-notifications')).toBeTruthy();
  expect(usePreferences.getState().sundayReminder).toBe(false);
  expect(reminderSwitch().props.value).toBe(false);
  await fireEvent.press(screen.getByTestId('settings-open-notifications'));
  expect(open).toHaveBeenCalled();
});

test('flips on at once while the phone asks, then settles on the answer', async () => {
  mockPermission = 'undetermined';
  await render(<ReminderSetting />);
  await fireEvent(reminderSwitch(), 'valueChange', true);
  expect(reminderSwitch().props.value).toBe(true);

  // A second flick while the prompt is up is ignored.
  await fireEvent(reminderSwitch(), 'valueChange', false);
  expect(reminderSwitch().props.value).toBe(true);

  mockPermission = 'blocked';
  await act(async () => mockResolveReminder(false));
  expect(reminderSwitch().props.value).toBe(false);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ actionLabel: 'Open Settings' }));
  expect(screen.getByTestId('settings-open-notifications')).toBeTruthy();
});

test('stays on when the phone allows it', async () => {
  mockPermission = 'granted';
  await render(<ReminderSetting />);
  await fireEvent(reminderSwitch(), 'valueChange', true);
  await act(async () => mockResolveReminder(true));
  expect(usePreferences.getState().sundayReminder).toBe(true);
  expect(reminderSwitch().props.value).toBe(true);
  expect(mockToast).not.toHaveBeenCalled();
});
