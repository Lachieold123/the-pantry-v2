// A second tap during a sheet's closing animation must not plan, add or log
// twice, or go back two screens (BUG-02).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CookScreen } from '@/features/cook/CookScreen';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { AddToListSheet } from './AddToListSheet';
import { PlanRecipeSheet } from './PlanRecipeSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, FadeIn: { duration: () => ({}) }, useReducedMotion: () => true };
});
jest.mock('react-native-gesture-handler', () => {
  const chain: object = new Proxy({}, { get: () => () => chain });
  return { Gesture: { Pan: () => chain }, GestureDetector: ({ children }: { children: unknown }) => children };
});
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: () => Promise.resolve(), deactivateKeepAwake: () => undefined }));

beforeEach(() => {
  jest.clearAllMocks();
  usePlan.setState({ entries: [], listEdits: {} });
  useCupboard.setState({ items: [] });
  useCookLog.setState({ log: [] });
});

it('plans once when Plan is pressed twice', async () => {
  await render(<PlanRecipeSheet id="carbonara" />);
  const plan = screen.getByTestId('plan-confirm');
  await fireEvent.press(plan);
  await fireEvent.press(plan);
  expect(usePlan.getState().entries).toHaveLength(1);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it('adds to the list once when Add is pressed twice', async () => {
  await render(<AddToListSheet id="carbonara" servings={2} />);
  const add = screen.getByTestId('list-confirm');
  await fireEvent.press(add);
  await fireEvent.press(add);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it('logs one cook when Done is pressed twice', async () => {
  await render(<CookScreen id="carbonara" />);
  for (let i = 0; i < 30; i++) {
    const next = screen.queryByTestId('cook-next');
    if (!next) break;
    await fireEvent.press(next);
  }
  const done = screen.getByTestId('cook-done');
  await fireEvent.press(done);
  await fireEvent.press(done);
  expect(useCookLog.getState().log).toHaveLength(1);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});
