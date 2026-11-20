// Another cook's recipe on the recipe page: their byline opens their profile,
// their caption and the photo credit show, and the actions that need this
// phone's recipe book aren't offered.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { parseFeedItem, parseRecipe } from '@/domain/published/published';
import { COOK_ROW, feedRow, RECIPE_JSON } from '@/domain/testing/published';
import { PublishedRecipeScreen } from './PublishedRecipeScreen';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockRead = jest.fn();
jest.mock('@/lib/published', () => ({
  ...jest.requireActual('@/lib/published'),
  fetchPublishedRecipe: (id: string) => mockRead(id),
}));

const ROW = feedRow(1, { photo_source: 'ai', photo_credit: 'AI-generated photo', caption: 'Better the next day, honestly.' });

beforeEach(() => jest.clearAllMocks());

describe('a published recipe', () => {
  it('shows the recipe, the cook, their caption and the photo credit', async () => {
    mockRead.mockResolvedValueOnce({ ok: true, value: { item: parseFeedItem(ROW), recipe: parseRecipe(RECIPE_JSON, ROW.id) } });
    await render(<PublishedRecipeScreen id={ROW.id} />);
    expect(await screen.findByText('Escabeche')).toBeTruthy();
    expect(mockRead).toHaveBeenCalledWith(ROW.id);
    expect(screen.getByText('Better the next day, honestly.')).toBeTruthy();
    expect(screen.getByText('Fry the fish hard and fast.')).toBeTruthy();
    expect(screen.getByText('Better the next day.')).toBeTruthy();
    expect(screen.getByTestId('recipe-photo-credit').props.children).toBe('AI-generated photo');
    expect(screen.getByText('Kai Santos')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('recipe-author'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/cooks/[id]', params: { id: COOK_ROW.id } });
  });

  it('is read only: no save, plan, cook mode or add to list', async () => {
    mockRead.mockResolvedValueOnce({ ok: true, value: { item: parseFeedItem(ROW), recipe: parseRecipe(RECIPE_JSON, ROW.id) } });
    await render(<PublishedRecipeScreen id={ROW.id} />);
    await screen.findByText('Escabeche');
    for (const id of ['recipe-save', 'recipe-plan', 'recipe-cook', 'recipe-add-to-list', 'recipe-edit', 'recipe-more']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.getByTestId('recipe-servings')).toBeTruthy();
  });

  it('says when it has been taken down, with no retry', async () => {
    mockRead.mockResolvedValueOnce({ ok: false, problem: 'not-found' });
    await render(<PublishedRecipeScreen id="gone" />);
    expect(await screen.findByText('We couldn’t find that recipe')).toBeTruthy();
    expect(screen.queryByTestId('published-retry')).toBeNull();
  });

  it('tries again after a dropped connection', async () => {
    mockRead
      .mockResolvedValueOnce({ ok: false, problem: 'offline' })
      .mockResolvedValueOnce({ ok: true, value: { item: parseFeedItem(ROW), recipe: parseRecipe(RECIPE_JSON, ROW.id) } });
    await render(<PublishedRecipeScreen id={ROW.id} />);
    await fireEvent.press(await screen.findByTestId('published-retry'));
    expect(await screen.findByText('Escabeche')).toBeTruthy();
  });
});
