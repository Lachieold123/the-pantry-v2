// The countdown ticks inside the bar and stops once every timer is done, so a
// finished timer left on screen doesn't keep Cook Mode busy (audit F53).
import { act, render, screen } from '@testing-library/react-native';

import { startTimer } from '@/domain/cook/timers';
import { TimerBar } from './TimerBar';

// The bar's own half-second clocks still running (other components keep their own timers).
let ticking: Set<unknown>;
beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  ticking = new Set();
  const set = global.setInterval;
  const clear = global.clearInterval;
  jest.spyOn(global, 'setInterval').mockImplementation(((fn: () => void, ms?: number) => {
    const id = set(fn, ms);
    if (ms === 500) ticking.add(id);
    return id;
  }) as typeof setInterval);
  jest.spyOn(global, 'clearInterval').mockImplementation(((id: Parameters<typeof clearInterval>[0]) => {
    ticking.delete(id);
    clear(id);
  }) as typeof clearInterval);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('counts down, then stops ticking when the timer finishes', async () => {
  await render(<TimerBar timers={[startTimer('a', '2 seconds', 0, 2, 0)]} onDismiss={() => {}} />);
  expect(screen.getByText('0:02')).toBeTruthy();
  expect(ticking.size).toBe(1);

  await act(async () => {
    jest.advanceTimersByTime(2500);
  });
  expect(screen.getByText('Time’s up')).toBeTruthy();
  expect(ticking.size).toBe(0);
});

test('a finished timer alone starts no clock', async () => {
  jest.setSystemTime(10_000);
  await render(<TimerBar timers={[startTimer('a', '2 seconds', 0, 2, 0)]} onDismiss={() => {}} />);
  expect(screen.getByText('Time’s up')).toBeTruthy();
  expect(ticking.size).toBe(0);
});
