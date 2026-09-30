// The menu slides out before it moves on. If the menu is closed another way in
// that moment (Android Back), the move must not run from the screen underneath,
// where `replace()` would swap that screen out for a lone page (audit F207).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DrawerScreen } from './DrawerScreen';

const mockRouter = { replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v, set: () => undefined }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
  };
});

afterEach(() => jest.useRealTimers());

test('a menu closed mid-slide does not then navigate', async () => {
  jest.useFakeTimers();
  const { unmount } = await render(<DrawerScreen />);
  await fireEvent.press(screen.getByTestId('menu-saved'));
  await unmount();
  await act(async () => jest.advanceTimersByTime(1000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('left open, the menu does move on once it has slid out', async () => {
  jest.useFakeTimers();
  await render(<DrawerScreen />);
  await fireEvent.press(screen.getByTestId('menu-saved'));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(mockRouter.replace).toHaveBeenCalledWith('/saved');
});
