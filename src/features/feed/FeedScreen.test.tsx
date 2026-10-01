// Home's lead card, tonight's planned dinner: it follows the real date (audit
// F16), ignores plan entries whose recipe is gone (F17), and steps aside once
// tonight's dinner is cooked (F22).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { toISODate } from '@/domain/plan/week';
import { useCookLog } from '@/store/cookLog';
import { usePlan } from '@/store/plan';
import { FeedScreen } from './FeedScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeIn: fade, FadeInDown: fade, FadeOutDown: fade, useReducedMotion: () => true };
});
// The first render loads the whole catalogue.
jest.setTimeout(30_000);

const RECIPE = 'chicken-burrito-bowl';
const today = () => toISODate(new Date());
const dinner = (id: string, recipeId: string, day: string) => ({ id, recipeId, day, slot: 'dinner' as const, servings: 4 });

beforeEach(() => {
  usePlan.setState({ entries: [] });
  useCookLog.setState({ log: [] });
});
afterEach(() => jest.useRealTimers());

// The carousel draws its cards once it knows its width, which a test has to tell it.
const showHome = async () => {
  await render(<FeedScreen />);
  await fireEvent(screen.getByTestId('home-heroes'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 500 } } });
};
const tonightCard = () => screen.queryByLabelText(/^Chicken Burrito Bowl\. Tonight · On the plan\./i);

test('a dinner whose recipe is gone doesn’t hide tonight’s real one (F17)', async () => {
  usePlan.setState({ entries: [dinner('gone', 'mine-deleted-recipe', today()), dinner('real', RECIPE, today())] });
  await showHome();
  expect(tonightCard()).toBeTruthy();
});

test('once tonight’s dinner is cooked, it stops leading as "On the plan" (F22)', async () => {
  usePlan.setState({ entries: [dinner('real', RECIPE, today())] });
  useCookLog.setState({ log: [{ id: 'c1', recipeId: RECIPE, cookedAt: Date.now() }] });
  await showHome();
  expect(tonightCard()).toBeNull();
});

test('left open past midnight, the next day’s planned dinner takes the lead (F16)', async () => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 23, 58) });
  usePlan.setState({ entries: [dinner('wed', RECIPE, '2026-09-30')] });
  await showHome();
  expect(tonightCard()).toBeNull();
  await act(async () => jest.advanceTimersByTime(5 * 60 * 1000));
  expect(tonightCard()).toBeTruthy();
});
