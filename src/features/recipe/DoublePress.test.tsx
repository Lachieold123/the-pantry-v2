// A second tap during a sheet's closing animation must not plan or add
// twice, or go back two screens (BUG-02). Cook Mode's Done: ../cook/CookDone.test.tsx.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { AddToListSheet } from './AddToListSheet';
import { PlanRecipeSheet } from './PlanRecipeSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  jest.clearAllMocks();
  usePlan.setState({ entries: [], listEdits: {} });
  useCupboard.setState({ items: [] });
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
