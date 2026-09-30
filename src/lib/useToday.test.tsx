// "Today" must move on by itself at midnight and when the app is resumed (audit F16).
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useToday } from './useToday';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('rolls over to the new day at local midnight', async () => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 23, 59, 0) });
  const { result, unmount } = await renderHook(() => useToday());
  expect(result.current).toBe('2026-09-29');
  await act(async () => jest.advanceTimersByTime(2 * 60 * 1000));
  expect(result.current).toBe('2026-09-30');
  // And again the night after, so it keeps going, not just once.
  await act(async () => jest.advanceTimersByTime(24 * 60 * 60 * 1000));
  expect(result.current).toBe('2026-10-01');
  await unmount();
});

test('catches up when the app comes back to the foreground', async () => {
  const handlers: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    handlers.push(handler as (s: AppStateStatus) => void);
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
  jest.useFakeTimers({ now: new Date(2026, 8, 28, 20, 0, 0) });
  const { result, unmount } = await renderHook(() => useToday());
  expect(result.current).toBe('2026-09-28');
  // Suspended overnight: timers didn't run, but the clock moved on.
  jest.setSystemTime(new Date(2026, 8, 29, 18, 0, 0));
  await act(async () => handlers.forEach((h) => h('active')));
  expect(result.current).toBe('2026-09-29');
  await unmount();
});
