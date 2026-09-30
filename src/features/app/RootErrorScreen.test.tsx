// A crashed screen offers a retry and a way home, and the crash is logged
// rather than lost (audit F69).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { setLogSink, type LogSink } from '@/lib/logger';
import { RootErrorScreen } from './RootErrorScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const logged: Parameters<LogSink>[] = [];
let previous: LogSink;
beforeEach(() => {
  logged.length = 0;
  mockReplace.mockClear();
  previous = setLogSink((...args) => logged.push(args));
});
afterEach(() => setLogSink(previous));

test('logs the crash once and retries on "Try again"', async () => {
  const retry = jest.fn(() => Promise.resolve());
  const error = new Error('boom');
  await render(<RootErrorScreen error={error} retry={retry} />);
  expect(logged).toEqual([['error', 'screen', 'boom', error]]);
  await fireEvent.press(screen.getByTestId('error-retry'));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

test('"Go to Tonight" goes home, then clears the error so the app renders there', async () => {
  const order: string[] = [];
  mockReplace.mockImplementation(() => order.push('replace'));
  const retry = jest.fn(() => {
    order.push('retry');
    return Promise.resolve();
  });
  await render(<RootErrorScreen error={new Error('boom')} retry={retry} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Go to Tonight' }));
  expect(mockReplace).toHaveBeenCalledWith('/');
  expect(order).toEqual(['replace', 'retry']);
});
