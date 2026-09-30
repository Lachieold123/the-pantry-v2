// Notification plumbing: timers are time-sensitive and the Sunday reminder
// isn't (Lachlan, 30 Sep 2026); tapping the reminder opens Plan (audit F133);
// a failed permission check reads as "no" rather than throwing (F46).
import { renderHook } from '@testing-library/react-native';

import { ensureNotificationPermission, notificationPermission, scheduleAt, setSundayReminder, useNotificationTaps } from './notifications';

const mockSchedule = jest.fn(async (_req: unknown) => 'id');
let mockResponse: unknown = null;
let mockPermissions: () => Promise<{ granted: boolean; canAskAgain: boolean }> = async () => ({ granted: true, canAskAgain: true });
const mockClear = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: () => mockPermissions(),
  requestPermissionsAsync: async () => ({ granted: false }),
  scheduleNotificationAsync: (req: unknown) => mockSchedule(req),
  cancelScheduledNotificationAsync: async () => undefined,
  useLastNotificationResponse: () => mockResponse,
  clearLastNotificationResponse: () => mockClear(),
  DEFAULT_ACTION_IDENTIFIER: 'default',
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
}));

beforeEach(() => {
  mockSchedule.mockClear();
  mockClear.mockClear();
  mockResponse = null;
  mockPermissions = async () => ({ granted: true, canAskAgain: true });
});

const contentOf = (call: number) => (mockSchedule.mock.calls[call]![0] as { content: Record<string, unknown> }).content;

test('cook timers break through Focus; the Sunday reminder does not, and carries where to go', async () => {
  await scheduleAt(Date.now() + 1000, 'Step 1 timer done', 'Simmer.', { timeSensitive: true });
  expect(contentOf(0).interruptionLevel).toBe('timeSensitive');
  await setSundayReminder(true);
  expect(contentOf(1).interruptionLevel).toBeUndefined();
  expect(contentOf(1).data).toEqual({ url: '/plan' });
});

test('a permission check that throws reads as no', async () => {
  mockPermissions = async () => {
    throw new Error('native module missing');
  };
  await expect(ensureNotificationPermission()).resolves.toBe(false);
  await expect(notificationPermission()).resolves.toBe('blocked');
});

test('reports blocked only when the phone will not ask again', async () => {
  mockPermissions = async () => ({ granted: false, canAskAgain: true });
  await expect(notificationPermission()).resolves.toBe('undetermined');
  mockPermissions = async () => ({ granted: false, canAskAgain: false });
  await expect(notificationPermission()).resolves.toBe('blocked');
});

const tap = (url: unknown, actionIdentifier = 'default') => ({
  actionIdentifier,
  notification: { request: { content: { data: { url } } } },
});

test('tapping the reminder opens its page, once', async () => {
  mockResponse = tap('/plan');
  const open = jest.fn();
  await renderHook(() => useNotificationTaps(open));
  expect(open).toHaveBeenCalledWith('/plan');
  expect(mockClear).toHaveBeenCalled();
});

test('ignores links that leave the app, and non-tap actions', async () => {
  const open = jest.fn();
  mockResponse = tap('https://example.com');
  await renderHook(() => useNotificationTaps(open));
  mockResponse = tap('//example.com');
  await renderHook(() => useNotificationTaps(open));
  mockResponse = tap('/plan', 'dismiss');
  await renderHook(() => useNotificationTaps(open));
  expect(open).not.toHaveBeenCalled();
});
