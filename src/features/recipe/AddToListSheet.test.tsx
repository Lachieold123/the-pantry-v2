import { fireEvent, render, screen } from '@testing-library/react-native';

import { shoppingWeek, toISODate } from '@/domain/plan/week';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { AddToListSheet } from './AddToListSheet';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockToast = jest.fn();
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const week = shoppingWeek(toISODate(new Date()));
const extras = () => usePlan.getState().listEdits[week]?.extras ?? [];

beforeEach(() => {
  jest.clearAllMocks();
  usePlan.setState({ entries: [], listEdits: {} });
  useCupboard.setState({ items: [{ ingredientId: 'egg', addedAt: 1, source: 'manual' }] });
});

describe('AddToListSheet', () => {
  it('ticks what you need, leaves what you have, and adds the amounts for the servings chosen', async () => {
    await render(<AddToListSheet id="carbonara" servings={4} />);
    expect(screen.getByText('You need')).toBeTruthy();
    expect(screen.getByText('You have these')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('list-confirm'));
    const added = extras();
    expect(added.map((x) => x.ingredientId).sort()).toEqual(['guanciale', 'pecorino', 'spaghetti']);
    // Carbonara serves 2; for 4 it's twice the spaghetti.
    expect(added.find((x) => x.ingredientId === 'spaghetti')).toMatchObject({ quantity: 400, unit: 'g', recipeId: 'carbonara' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ message: '3 added to your shopping list' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('lets you add something you have, and names what this recipe already put on the list', async () => {
    await render(<AddToListSheet id="carbonara" servings={2} />);
    await fireEvent.press(screen.getByTestId('list-row-egg'));
    await fireEvent.press(screen.getByTestId('list-confirm'));
    expect(extras().some((x) => x.ingredientId === 'egg')).toBe(true);
    await screen.unmount();

    await render(<AddToListSheet id="carbonara" servings={2} />);
    expect(screen.getByTestId('list-already')).toBeTruthy();
    // Nothing left to need, so the button says so and does nothing.
    expect(screen.getByText('Pick something to add')).toBeTruthy();
  });

  it('says so when the recipe is gone', async () => {
    await render(<AddToListSheet id="not-a-recipe" servings={undefined} />);
    expect(screen.getByText('This recipe isn’t available any more.')).toBeTruthy();
  });
});
