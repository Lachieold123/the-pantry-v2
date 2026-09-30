// The Welcome reveal: the photo opens the dish rather than planning it, the
// plan toast can be undone (audit F146), and new answers start the picks
// from the top again (F166).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { usePlan } from '@/store/plan';
import { WelcomeScreen } from './WelcomeScreen';

const mockPush = jest.fn();
const mockToast = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('@/lib/notifications', () => ({ setSundayReminder: jest.fn(async () => false) }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.setTimeout(30_000);

beforeEach(() => {
  mockPush.mockClear();
  mockToast.mockClear();
  usePlan.setState({ entries: [] });
});

async function toReveal() {
  await render(<WelcomeScreen />);
  await fireEvent.press(screen.getByTestId('welcome-start'));
  await fireEvent.press(screen.getByTestId('welcome-next'));
  await fireEvent.press(screen.getByTestId('welcome-next'));
}
const heroLabel = () => screen.getByTestId('welcome-pick').props.accessibilityLabel as string;

test('tapping the photo opens the recipe and plans nothing', async () => {
  await toReveal();
  await fireEvent.press(screen.getByTestId('welcome-pick'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/recipe/[id]', params: { id: expect.any(String) } });
  expect(usePlan.getState().entries).toEqual([]);
});

test('"Cook this tonight" plans it, and the toast can undo that', async () => {
  await toReveal();
  await fireEvent.press(screen.getByTestId('welcome-cook-tonight'));
  expect(usePlan.getState().entries).toHaveLength(1);
  const { undo } = mockToast.mock.calls.at(-1)[0] as { undo?: () => void };
  expect(undo).toBeDefined();
  undo?.();
  expect(usePlan.getState().entries).toEqual([]);
});

test('going back and forward again starts from the best pick', async () => {
  await toReveal();
  const best = heroLabel();
  await fireEvent.press(screen.getByTestId('welcome-show-others'));
  expect(heroLabel()).not.toBe(best);
  await fireEvent.press(screen.getByTestId('welcome-back'));
  await fireEvent.press(screen.getByTestId('welcome-next'));
  expect(heroLabel()).toBe(best);
});
