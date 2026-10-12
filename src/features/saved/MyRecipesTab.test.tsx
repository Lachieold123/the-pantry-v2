// My recipes in v1's layout: a name and "Add" opens the editor with that name;
// a link and "Import" reads the page right there, says plainly what went
// wrong, and hands a found recipe to the editor to check.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { usePendingImport } from '@/store/pendingImport';
import { usePro } from '@/store/pro';
import { MyRecipesTab } from './MyRecipesTab';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));

const page = (body: string) =>
  ({
    ok: true,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'text/html' : null) },
    text: async () => body,
  }) as unknown as Response;

const RECIPE_PAGE = `<html><head><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Leek pie',
  recipeIngredient: ['2 leeks, sliced', '1 sheet puff pastry'],
  recipeInstructions: [{ '@type': 'HowToStep', text: 'Bake.' }],
})}</script></head></html>`;

beforeEach(() => {
  jest.clearAllMocks();
  usePendingImport.setState({ pending: undefined });
  usePro.setState({ importsAt: [] });
});
afterEach(() => jest.restoreAllMocks());

describe('My recipes', () => {
  it('shows v1’s rows and a quiet line when there are no recipes yet', async () => {
    await render(<MyRecipesTab />);
    expect(screen.getByLabelText('Recipe name')).toBeTruthy();
    expect(screen.getByLabelText('Recipe link')).toBeTruthy();
    expect(screen.getByText('Or import from a link')).toBeTruthy();
    expect(screen.getByTestId('mine-empty')).toBeTruthy();
  });

  it('Add opens the editor with the typed name, or blank with none', async () => {
    await render(<MyRecipesTab />);
    await fireEvent.changeText(screen.getByTestId('mine-name'), '  Nan’s lentil soup ');
    await fireEvent.press(screen.getByTestId('mine-name-submit'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/my-recipe/edit', params: { title: 'Nan’s lentil soup' } });
    // The field empties, so coming back doesn't show a name already used.
    expect(screen.getByTestId('mine-name').props.value).toBe('');
    await fireEvent.press(screen.getByTestId('mine-name-submit'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/my-recipe/edit');
  });

  it('refuses something that isn’t a link, in words, without fetching', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    await render(<MyRecipesTab />);
    await fireEvent.changeText(screen.getByTestId('mine-link'), 'not a link');
    await fireEvent.press(screen.getByTestId('mine-link-submit'));
    expect(screen.getByTestId('mine-link-error')).toHaveTextContent(/look like a web link/);
    expect(fetch).not.toHaveBeenCalled();
    // Typing again clears the complaint.
    await fireEvent.changeText(screen.getByTestId('mine-link'), 'https://');
    expect(screen.queryByTestId('mine-link-error')).toBeNull();
  });

  it('offers to write it by hand when the page has no recipe', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(page('<html>no recipe here</html>'));
    await render(<MyRecipesTab />);
    await fireEvent.changeText(screen.getByTestId('mine-link'), 'https://example.com/pie');
    await fireEvent.press(screen.getByTestId('mine-link-submit'));
    await waitFor(() => expect(screen.getByTestId('mine-link-error')).toHaveTextContent(/couldn’t find a recipe/));
    expect(usePro.getState().importsAt).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('mine-write-by-hand'));
    expect(mockRouter.push).toHaveBeenCalledWith('/my-recipe/edit');
  });

  it('hands a found recipe to the editor and counts the import', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(page(RECIPE_PAGE));
    await render(<MyRecipesTab />);
    await fireEvent.changeText(screen.getByTestId('mine-link'), 'example.com/pie');
    await fireEvent.press(screen.getByTestId('mine-link-submit'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/my-recipe/edit', params: { from: 'import' } }));
    const pending = usePendingImport.getState().pending;
    expect(pending?.draft.title).toBe('Leek pie');
    expect(pending?.url).toBe('https://example.com/pie');
    expect(usePro.getState().importsAt).toHaveLength(1);
  });
});
