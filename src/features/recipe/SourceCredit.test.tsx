// An imported recipe credits the site it came from, and the credit opens it (K-13).
// A missing or unreadable link shows nothing, not an empty credit or a dead link.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { EMPTY_DRAFT } from '@/domain/recipes/draft';
import { useMyRecipes } from '@/store/myRecipes';
import { RecipeScreen } from './RecipeScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true }) }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const ID = 'my-import-1';

function seed(sourceUrl: string | undefined) {
  useMyRecipes.setState({
    recipes: {
      [ID]: {
        id: ID,
        source: 'imported',
        sourceUrl,
        createdAt: 1,
        updatedAt: 1,
        draft: {
          ...EMPTY_DRAFT,
          title: 'Lentil soup',
          cuisine: 'british',
          ingredientsText: '1 cup red lentils\n1 litre vegetable stock',
          methodText: 'Simmer the lentils in the stock.',
        },
      },
    },
  });
}

beforeEach(() => jest.restoreAllMocks());

it('shows "From <site>" as a link that opens the original recipe', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  seed('https://www.bbcgoodfood.com/recipes/lentil-soup');
  await render(<RecipeScreen id={ID} />);
  const credit = screen.getByTestId('recipe-source-credit');
  expect(credit).toHaveTextContent('From bbcgoodfood.com');
  expect(credit).toHaveProp('accessibilityRole', 'link');
  expect(screen.getByRole('link', { name: 'From bbcgoodfood.com' })).toBeTruthy();
  await fireEvent.press(credit);
  expect(open).toHaveBeenCalledWith('https://www.bbcgoodfood.com/recipes/lentil-soup');
});

it.each([
  ['no link', undefined],
  ['a malformed link', 'not a link'],
  ['an unsafe link', 'javascript:alert(1)'],
])('shows no credit for %s', async (_, url) => {
  seed(url);
  await render(<RecipeScreen id={ID} />);
  expect(screen.getByText('Lentil soup')).toBeTruthy();
  expect(screen.queryByTestId('recipe-source-credit')).toBeNull();
});

it('shows no source credit on a house recipe', async () => {
  await render(<RecipeScreen id="carbonara" />);
  expect(screen.queryByTestId('recipe-source-credit')).toBeNull();
});
