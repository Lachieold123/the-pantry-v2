import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { quickChips, togglePreset } from '@/domain/recipes/browse';
import { EMPTY_DRAFT } from '@/domain/recipes/draft';
import { NO_FILTERS, seasonOn } from '@/domain/recipes/search';
import { useMyRecipes } from '@/store/myRecipes';
import { useRecipeFilters } from '@/store/recipeFilters';
import { RecipesScreen } from './RecipesScreen';

// A store build before any recipe is vetted: the bundled catalogue is empty.
jest.mock('@/data/catalogue/catalogue', () => ({ ...jest.requireActual('@/data/catalogue/catalogue'), CATALOGUE: [] }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

beforeEach(async () => {
  await act(() => {
    useRecipeFilters.setState({ query: '', filters: NO_FILTERS, showAll: false, presetLabel: undefined });
    useMyRecipes.setState({
      recipes: {
        mine: {
          id: 'mine',
          source: 'user',
          createdAt: 1,
          updatedAt: 1,
          draft: {
            ...EMPTY_DRAFT,
            title: 'Nan’s quick soup',
            cuisine: 'modern-australian',
            prepMinutes: 5,
            cookMinutes: 10,
            ingredientsText: '1 brown onion\n1 L chicken stock',
            methodText: 'Soften the onion.\nAdd the stock and simmer.',
          },
        },
      },
    });
  });
});

describe('RecipesScreen', () => {
  it('shows your own recipes even when no catalogue recipe is vetted yet', async () => {
    await render(<RecipesScreen />);
    expect(screen.queryByText('The kitchen is still testing')).toBeNull();
    expect(screen.getByTestId('browse-search')).toBeTruthy();
  });

  it('names the results after the chip you tapped, and closing it turns off only that chip', async () => {
    const quick = quickChips(seasonOn(new Date())).find((c) => c.id === 'quick');
    if (!quick) throw new Error('no 30 min chip');
    await act(() => {
      useRecipeFilters.setState({ showAll: true });
      useRecipeFilters.getState().apply(togglePreset(quick, NO_FILTERS, ''), quick.label);
    });
    await render(<RecipesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '30 min, clear' }));
    expect(useRecipeFilters.getState().filters).toEqual(NO_FILTERS);
    // "See all" was on before the chip, so it stays on.
    expect(useRecipeFilters.getState().showAll).toBe(true);
  });

  it('has no pill when more than the chip is on', async () => {
    const quick = quickChips(seasonOn(new Date())).find((c) => c.id === 'quick');
    if (!quick) throw new Error('no 30 min chip');
    await act(() => {
      useRecipeFilters.getState().apply(togglePreset(quick, { ...NO_FILTERS, diet: 'vegan' }, ''), quick.label);
    });
    await render(<RecipesScreen />);
    expect(screen.queryByTestId('browse-pill')).toBeNull();
  });
});
