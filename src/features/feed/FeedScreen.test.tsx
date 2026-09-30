// The Feed's "Tonight": it follows the real date (audit F16), ignores plan
// entries whose recipe is gone (F17), knows when tonight's dinner is cooked
// (F22), and labels the rolling days ahead honestly (F143).
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
const tomorrow = () => toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));
const dinner = (id: string, recipeId: string, day: string) => ({ id, recipeId, day, slot: 'dinner' as const, servings: 4 });

beforeEach(() => {
  usePlan.setState({ entries: [] });
  useCookLog.setState({ log: [] });
});
afterEach(() => jest.useRealTimers());

test('a dinner whose recipe is gone doesn’t hide tonight’s real one (F17)', async () => {
  usePlan.setState({ entries: [dinner('gone', 'mine-deleted-recipe', today()), dinner('real', RECIPE, today())] });
  await render(<FeedScreen />);
  expect(screen.getByText('On for dinner')).toBeTruthy();
  expect(screen.getByTestId('feed-cook')).toBeTruthy();
});

test('once tonight’s dinner is cooked, the Feed says so and stops offering Start cooking (F22)', async () => {
  usePlan.setState({ entries: [dinner('real', RECIPE, today())] });
  useCookLog.setState({ log: [{ id: 'c1', recipeId: RECIPE, cookedAt: Date.now() }] });
  await render(<FeedScreen />);
  expect(screen.getByText('Cooked tonight')).toBeTruthy();
  expect(screen.queryByTestId('feed-cook')).toBeNull();
});

test('the days ahead are labelled as a rolling window, not "This week" (F143)', async () => {
  usePlan.setState({ entries: [dinner('soon', RECIPE, tomorrow())] });
  await render(<FeedScreen />);
  expect(screen.getByText('Next few days')).toBeTruthy();
  expect(screen.queryByText('This week')).toBeNull();
});

test('left open past midnight, "Have this tonight" plans for the new day (F16)', async () => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 23, 58) });
  await render(<FeedScreen />);
  expect(screen.getByText(/Tonight · Tuesday 29 September/)).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(5 * 60 * 1000));
  expect(screen.getByText(/Tonight · Wednesday 30 September/)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('feed-have-tonight'));
  expect(usePlan.getState().entries.map((e) => e.day)).toEqual(['2026-09-30']);
});
