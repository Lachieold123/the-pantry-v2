// Surprise me: two taps in the same frame start one spin, not two (audit
// F29), and an empty deck names its real cause with a way out (F31).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { totalMinutes } from '@/domain/recipes/types';
import { SPIN_DELAYS } from '@/domain/suggestions/spinner';
import { useSaved } from '@/store/saved';
import { SpinnerScreen } from './SpinnerScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => undefined), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
// The real module needs the native worklets runtime; the deck's motion isn't what's tested here.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeIn: fade, FadeInDown: fade, FadeOutDown: fade, useReducedMotion: () => false };
});
jest.mock('./SpinDeck', () => ({ SpinDeck: () => null }));
// A plain button whose handler a test can call twice inside one act(), as two taps in one frame would.
jest.mock('@/ui/primitives/Button', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => (
      <Text testID={testID} onPress={onPress}>
        {label}
      </Text>
    ),
  };
});
jest.setTimeout(30_000);

const hideAllBut = (keep: string[]) => useSaved.setState({ hidden: CATALOGUE.map((r) => r.id).filter((id) => !keep.includes(id)) });

beforeEach(() => {
  mockPush.mockClear();
  jest.mocked(Haptics.notificationAsync).mockClear();
  useSaved.setState({ hidden: [] });
});

test('a second tap in the same frame does not start a second reel', async () => {
  jest.useFakeTimers();
  try {
    await render(<SpinnerScreen />);
    const spin = screen.getByTestId('spinner-spin').props.onPress as () => void;
    await act(() => {
      spin();
      spin();
    });
    // Just past the whole reel: runAllTimers would never end, as the live "today" re-arms its midnight timer.
    await act(() => jest.advanceTimersByTime(SPIN_DELAYS.reduce((a, b) => a + b, 0) + 1000));
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test('when nothing fits what you eat, it says so and opens Settings', async () => {
  hideAllBut([]);
  await render(<SpinnerScreen />);
  expect(screen.getByText('Nothing fits what you eat')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('spinner-empty-action'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

test('when only the meal and time rule dishes out, one tap spins across everything', async () => {
  // A long cook is ruled out by the starting "45 min or less".
  const slow = CATALOGUE.find((r) => totalMinutes(r) > 60);
  if (!slow) throw new Error('The catalogue has no long cooks');
  hideAllBut([slow.id]);
  await render(<SpinnerScreen />);
  expect(screen.getByText('No dishes match')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('spinner-empty-action'));
  expect(screen.queryByTestId('spinner-empty')).toBeNull();
  expect(screen.getByTestId('spinner-spin')).toBeTruthy();
});
