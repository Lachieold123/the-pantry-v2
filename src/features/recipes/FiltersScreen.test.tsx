import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { NO_FILTERS } from '@/domain/recipes/search';
import { useRecipeFilters } from '@/store/recipeFilters';
import { FiltersScreen } from './FiltersScreen';

const mockBack = jest.fn();
// The sheet's footer reads the safe area, which needs a native frame under Jest.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, canGoBack: () => true, push: jest.fn() }) }));

beforeEach(() => {
  mockBack.mockClear();
  useRecipeFilters.setState({ query: '', filters: NO_FILTERS, showAll: false });
});

describe('FiltersScreen', () => {
  it('"Show all recipes" opens the full list, not the shelves', async () => {
    await render(<FiltersScreen />);
    await fireEvent.press(screen.getByTestId('filters-show'));
    expect(useRecipeFilters.getState().showAll).toBe(true);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('with a filter on, the footer only closes the sheet', async () => {
    await act(() => useRecipeFilters.setState({ filters: { ...NO_FILTERS, diet: 'vegan' } }));
    await render(<FiltersScreen />);
    await fireEvent.press(screen.getByTestId('filters-show'));
    expect(useRecipeFilters.getState().showAll).toBe(false);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('says "1 recipe matches", in the singular', async () => {
    await act(() => useRecipeFilters.setState({ query: 'moussaka' }));
    await render(<FiltersScreen />);
    expect(screen.getByText(/^1 recipe matches$/i)).toBeTruthy();
  });
});
