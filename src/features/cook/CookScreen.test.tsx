// Cook Mode's exits: leaving with a timer running asks first (audit F45), Done
// logs the cook once however fast it's tapped (F163), a bad servings link falls
// back to the recipe's own (F52), and the ingredients keep their groups (F169).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useCookLog } from '@/store/cookLog';
import { CookScreen } from './CookScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 's' } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// Only what Cook Mode uses: the real module needs the native worklets runtime.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeIn: fade, FadeInDown: fade, FadeOutDown: fade, useReducedMotion: () => true };
});
jest.mock('@/lib/notifications', () => ({
  ensureNotificationPermission: async () => true,
  scheduleAt: async () => 'n1',
  cancelScheduled: async () => undefined,
}));

// Four steps; step 1 says "Rest 15 minutes"; groups "Chicken", "Cilantro lime rice", "Bowls".
const RECIPE = 'chicken-burrito-bowl';
// The first render loads the whole catalogue.
jest.setTimeout(30_000);

beforeEach(() => {
  mockBack.mockClear();
  useCookLog.setState({ log: [] });
});

test('× leaves straight away when no timer is running', async () => {
  await render(<CookScreen id={RECIPE} />);
  await fireEvent.press(screen.getByTestId('cook-close'));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('× asks first while a timer runs, and Keep cooking stays', async () => {
  await render(<CookScreen id={RECIPE} />);
  await fireEvent.press(screen.getByLabelText('Start a 15 minutes timer'));
  expect(await screen.findByText('Step 1 · 15 minutes')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('cook-close'));
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.getByTestId('cook-leave-confirm')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('cook-leave-stay'));
  expect(screen.queryByTestId('cook-leave-confirm')).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByTestId('cook-close'));
  await fireEvent.press(screen.getByTestId('cook-leave-go'));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('Done tapped twice logs one cook', async () => {
  await render(<CookScreen id={RECIPE} />);
  for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByTestId('cook-next'));
  const done = screen.getByTestId('cook-done');
  await fireEvent.press(done);
  await fireEvent.press(done);
  expect(useCookLog.getState().log).toHaveLength(1);
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('ingredients show their group headings, capitalised, and a bad servings link falls back', async () => {
  await render(<CookScreen id={RECIPE} servings="Infinity" />);
  await fireEvent.press(screen.getByTestId('cook-toggle-ingredients'));
  expect(screen.getByText('For 4')).toBeTruthy();
  expect(screen.getByText('Chicken')).toBeTruthy();
  expect(screen.getByText('Cilantro lime rice')).toBeTruthy();
  const first = screen.getByTestId('cook-ingredient-0-0');
  const text = String(first.props.children);
  expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
});
