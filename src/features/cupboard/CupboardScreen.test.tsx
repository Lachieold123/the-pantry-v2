// The Cupboard tab end to end on one screen: the empty state, the staples
// switch (saved, and honest about what it covers), and the two match shelves
// with a saved recipe on "From your saved" and not again on "Suggested".
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CATALOGUE, INGREDIENTS } from '@/data/catalogue/catalogue';
import { DEFAULT_SHELF } from '@/domain/cupboard/cookable';
import { allLines } from '@/domain/recipes/types';
import { useCupboard } from '@/store/cupboard';
import { useSaved } from '@/store/saved';
import { CupboardScreen } from './CupboardScreen';
import { MatchShelves } from './MatchShelves';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

/** Everything a recipe needs that isn't a staple, so it's ready to cook from the cupboard alone. */
function stockFor(recipeId: string): string[] {
  const recipe = CATALOGUE.find((r) => r.id === recipeId)!;
  const ids = allLines(recipe)
    .filter((l) => l.ingredientId && !l.optional && l.quantity !== undefined)
    .map((l) => l.ingredientId!)
    .filter((id) => !INGREDIENTS.byId.get(id)?.staple);
  return [...new Set(ids)];
}

const saved = CATALOGUE[0]!;

beforeEach(() => {
  jest.clearAllMocks();
  useCupboard.setState({ items: [], shelf: DEFAULT_SHELF });
  useSaved.setState({ bookmarks: [], hidden: [] });
});

describe('the Cupboard tab', () => {
  it('starts empty, with the staples switch on and no shelves', async () => {
    await render(<CupboardScreen />);
    expect(screen.getByTestId('cupboard-empty')).toBeTruthy();
    expect(screen.getByTestId('cupboard-staples').props.value).toBe(true);
    expect(screen.queryByTestId('cupboard-from-saved')).toBeNull();
    expect(screen.queryByTestId('cupboard-suggested')).toBeNull();
  });

  it('saves the staples switch, and says what still counts when it is off', async () => {
    await render(<CupboardScreen />);
    await fireEvent(screen.getByTestId('cupboard-staples'), 'valueChange', false);
    expect(useCupboard.getState().shelf.mode).toBe('mine');
    expect(screen.getByText('No shelf items ticked yet. Salt, pepper, oil and water always count.')).toBeTruthy();
    await fireEvent(screen.getByTestId('cupboard-staples'), 'valueChange', true);
    expect(useCupboard.getState().shelf.mode).toBe('assume');
  });

  it('shows a saved recipe the cupboard can cook on "From your saved", and not again on "Suggested"', async () => {
    const stock = stockFor(saved.id);
    await act(async () => {
      useCupboard.getState().add(stock, 'manual');
      useSaved.setState({ bookmarks: [{ recipeId: saved.id, savedAt: 1 }] });
    });
    await render(<CupboardScreen />);
    expect(screen.getByTestId('cupboard-from-saved')).toBeTruthy();
    expect(screen.getByText('Step 3 · 1 from your Cookmarks')).toBeTruthy();
    expect(screen.getByTestId(`saved-match-${saved.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`match-${saved.id}`)).toBeNull();
  });

  it('counts the jars and their categories', async () => {
    await act(async () => useCupboard.getState().add(stockFor(saved.id), 'manual'));
    await render(<CupboardScreen />);
    expect(screen.getByText(/^Step 2 · \d+ things? · \d+ categor(y|ies)$/)).toBeTruthy();
  });
});

describe('the match shelves', () => {
  it('say plainly when nothing is close', async () => {
    await render(<MatchShelves fromSaved={[]} suggested={[]} />);
    expect(screen.getByTestId('cupboard-no-matches')).toBeTruthy();
    expect(screen.getByText('Nothing close yet')).toBeTruthy();
  });

  it('open "See all" and a recipe from the suggested shelf', async () => {
    const recipe = CATALOGUE[0]!;
    const result = { have: ['x'], swaps: [], shelf: [], missing: [], perishablesUsed: 0 };
    await render(<MatchShelves fromSaved={[]} suggested={[{ recipe, result, tier: 'ready' }]} />);
    expect(screen.getByText('Step 3 · 1 ready')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('cupboard-see-all'));
    expect(mockRouter.push).toHaveBeenCalledWith('/cupboard/cookable');
    await fireEvent.press(screen.getByTestId(`match-${recipe.id}`));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  });

  it('give a saved recipe far from ready its count to buy', async () => {
    const recipe = CATALOGUE[0]!;
    const result = { have: ['x'], swaps: [], shelf: [], missing: ['a', 'b', 'c'], perishablesUsed: 0 };
    await render(<MatchShelves fromSaved={[{ recipe, result, ready: false }]} suggested={[]} />);
    expect(screen.getByLabelText(new RegExp(`^${recipe.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. 3 to buy\\.`))).toBeTruthy();
    expect(screen.queryByTestId('cupboard-see-all')).toBeNull();
  });
});
