// Pressing Done twice during the closing animation logs one cook and goes
// back one screen (BUG-02).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { CookScreen } from './CookScreen';

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
  useCupboard.setState({ items: [] });
  useCookLog.setState({ log: [] });
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
