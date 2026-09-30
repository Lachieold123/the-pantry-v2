// Toasts: Undo is announced and, with a screen reader on, waits to be dismissed
// (audit F100); a plain message never wipes an Undo still showing (audit F140).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable } from 'react-native';

import { ToastProvider, useToast, type ToastInput } from './Toast';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeInDown: fade, FadeOutDown: fade };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const spoken = jest.mocked(AccessibilityInfo.announceForAccessibility);
const screenReader = jest.mocked(AccessibilityInfo.isScreenReaderEnabled);
// One hidden button per toast the test will raise, pressed in turn by say().
function Grab({ toasts }: { toasts: ToastInput[] }) {
  const toast = useToast();
  return toasts.map((t, i) => <Pressable key={i} testID={`raise-${i}`} onPress={() => toast(t)} />);
}
const say = async (i: number) => {
  await fireEvent.press(screen.getByTestId(`raise-${i}`));
};

beforeEach(() => {
  jest.useFakeTimers();
  spoken.mockClear();
  screenReader.mockResolvedValue(false);
});
afterEach(() => jest.useRealTimers());

test('an Undo toast says Undo is there', async () => {
  await render(
    <ToastProvider>
      <Grab toasts={[{ message: 'Collection deleted', undo: () => {} }]} />
    </ToastProvider>,
  );
  await say(0);
  expect(spoken).toHaveBeenCalledWith('Collection deleted. Undo available.');
});

test('a plain message arriving later leaves the Undo in place', async () => {
  const undo = jest.fn();
  await render(
    <ToastProvider>
      <Grab toasts={[{ message: 'Rice used up', undo }, { message: 'Milk is already on the list' }]} />
    </ToastProvider>,
  );
  await say(0);
  await say(1);
  expect(screen.getByText('Milk is already on the list')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(undo).toHaveBeenCalledTimes(1);
});

test('without a screen reader an Undo toast goes after a few seconds', async () => {
  await render(
    <ToastProvider>
      <Grab toasts={[{ message: 'Removed', undo: () => {} }]} />
    </ToastProvider>,
  );
  await say(0);
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.queryByText('Removed')).toBeNull();
});

test('with a screen reader on, an Undo toast stays until dismissed', async () => {
  screenReader.mockResolvedValue(true);
  await render(
    <ToastProvider>
      <Grab toasts={[{ message: 'Removed', undo: () => {} }]} />
    </ToastProvider>,
  );
  await act(async () => {});
  await say(0);
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(screen.getByText('Removed')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText('Removed')).toBeNull();
});
