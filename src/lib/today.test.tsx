// "Today" moves on at midnight and on return to the app, for screens that stay mounted (BUG-12).
import { act, renderHook } from '@testing-library/react-native';

import { useToday } from './today';

it('changes at midnight without a re-render from elsewhere', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 6, 23, 59, 0) });
  const { result } = await renderHook(() => useToday());
  expect(result.current).toBe('2026-10-06');
  await act(async () => {
    jest.advanceTimersByTime(2 * 60_000);
  });
  expect(result.current).toBe('2026-10-07');
  jest.useRealTimers();
});
