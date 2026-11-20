// Pressing Done twice during the closing animation logs one cook and goes
// back one screen (BUG-02).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { CookScreen } from './CookScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('@/lib/notifications', () => ({ ensureNotificationPermission: async () => false, scheduleAt: jest.fn(), cancelScheduled: jest.fn() }));
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

const toEnd = async () => {
  for (let i = 0; i < 30; i++) {
    const next = screen.queryByTestId('cook-next');
    if (!next) break;
    await fireEvent.press(next);
  }
};

it('Undo after "cooked" puts back what was used up (F-7)', async () => {
  useCupboard.getState().add(['egg'], 'manual');
  await render(<CookScreen id="carbonara" />);
  await toEnd();
  await fireEvent.press(screen.getByTestId('cook-done'));
  await fireEvent.press(screen.getByTestId('used-up-egg'));
  await fireEvent.press(screen.getByTestId('used-up-done'));
  expect(useCupboard.getState().items.some((i) => i.ingredientId === 'egg')).toBe(false);
  const { undo } = mockToast.mock.calls[0]?.[0] ?? {};
  undo?.();
  expect(useCookLog.getState().log).toHaveLength(0);
  expect(useCupboard.getState().items.some((i) => i.ingredientId === 'egg')).toBe(true);
});

it('asks before closing while a timer runs, and stays if the cook says no (F-6)', async () => {
  await render(<CookScreen id="carbonara" />);
  for (let i = 0; i < 30 && !screen.queryByRole('link', { name: /^Start a / }); i++) await fireEvent.press(screen.getByTestId('cook-next'));
  await fireEvent.press(screen.getAllByRole('link', { name: /^Start a / })[0]!);
  await fireEvent.press(screen.getByLabelText('Leave Cook Mode'));
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(screen.getByText(/left on your timer\. Leaving stops it\./)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('sheet-cancel'));
  expect(mockRouter.back).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Leave Cook Mode'));
  await fireEvent.press(screen.getByTestId('cook-leave'));
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
});
