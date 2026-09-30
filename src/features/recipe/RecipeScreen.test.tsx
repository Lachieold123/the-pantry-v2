// A planned dinner opens scaled to what it was planned for, and that carries on
// into Cook and the plan sheet (audit F37).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeScreen } from './RecipeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
}));
jest.mock('expo-status-bar', () => {
  const { View } = jest.requireActual('react-native');
  return { StatusBar: ({ style }: { style: string }) => <View testID="status-bar" accessibilityLabel={style} /> };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeIn: fade, FadeInDown: fade, FadeOutDown: fade, useReducedMotion: () => true };
});
jest.setTimeout(30_000);

// Written for 4.
const RECIPE = 'chicken-burrito-bowl';

beforeEach(() => mockPush.mockClear());

test('opens at the planned servings and passes them on to Cook and the plan sheet', async () => {
  await render(<RecipeScreen id={RECIPE} servings="8" />);
  expect(screen.getByLabelText('Serves 8. Change servings and units')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('recipe-plan'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/recipe/[id]/plan', params: { id: RECIPE, servings: '8' } });
  await fireEvent.press(screen.getByTestId('recipe-cook'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/recipe/[id]/cook', params: { id: RECIPE, servings: '8' } });
});

test('without a param, or with a bad one, opens at the recipe’s own servings', async () => {
  await render(<RecipeScreen id={RECIPE} servings="Infinity" />);
  expect(screen.getByLabelText('Serves 4. Change servings and units')).toBeTruthy();
});

test('the status bar is light over the photo and dark once the sheet covers it (F113)', async () => {
  await render(<RecipeScreen id={RECIPE} />);
  expect(screen.getByTestId('status-bar').props.accessibilityLabel).toBe('light');
  await fireEvent.scroll(screen.getByTestId('recipe-screen'), { nativeEvent: { contentOffset: { y: 400 } } });
  expect(screen.getByTestId('status-bar').props.accessibilityLabel).toBe('dark');
});
