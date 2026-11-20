// A timer's alert never outlives the timer (BUG-22), even when the permission
// prompt is slow, and a permission error is just "no permission" (BUG-23).
import { act, renderHook } from '@testing-library/react-native';

import { useCookTimers } from './useCookTimers';

let resolvePermission: (v: boolean) => void = () => undefined;
const cancelled: string[] = [];
jest.mock('@/lib/notifications', () => ({
  ensureNotificationPermission: () =>
    new Promise<boolean>((r) => {
      resolvePermission = r;
    }),
  scheduleAt: async () => 'alert-1',
  cancelScheduled: async (id?: string) => {
    if (id) cancelled.push(id);
  },
}));
jest.mock('expo-haptics', () => ({ notificationAsync: async () => undefined, NotificationFeedbackType: { Success: 's' } }));

beforeEach(() => {
  cancelled.length = 0;
});

it('cancels the alert when Cook Mode closes while the permission prompt is up', async () => {
  const { result, unmount } = await renderHook(() => useCookTimers('Steak'));
  let started: Promise<void> = Promise.resolve();
  await act(async () => {
    started = result.current.start('3 minutes', 0, 180, 0);
  });
  await unmount();
  resolvePermission(true);
  await started;
  expect(cancelled).toEqual(['alert-1']);
});

it('cancels the alert when the timer is dismissed before it was scheduled', async () => {
  const { result } = await renderHook(() => useCookTimers('Steak'));
  let started: Promise<void> = Promise.resolve();
  await act(async () => {
    started = result.current.start('3 minutes', 0, 180, 0);
  });
  const id = result.current.timers[0]?.id ?? '';
  await act(async () => result.current.dismiss(id));
  await act(async () => {
    resolvePermission(true);
    await started;
  });
  expect(result.current.timers).toHaveLength(0);
  expect(cancelled).toEqual(['alert-1']);
});
