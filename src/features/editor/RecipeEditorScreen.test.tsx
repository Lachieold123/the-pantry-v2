// The editor starts from the name typed into My recipes' "Add" row, and
// treats it as work worth asking about before throwing away. An import or an
// existing recipe wins over a stray name.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EMPTY_DRAFT } from '@/domain/recipes/draft';
import { useMyRecipes } from '@/store/myRecipes';
import { usePendingImport } from '@/store/pendingImport';
import { RecipeEditorScreen } from './RecipeEditorScreen';
import { startingDraft } from './useRecipeEditor';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/ui/patterns/Toast', () => ({ useToast: () => jest.fn() }));
const mockAllowed = jest.fn((_feature: string) => true);
jest.mock('@/store/pro', () => ({ ...jest.requireActual('@/store/pro'), useAllowance: () => mockAllowed }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  jest.clearAllMocks();
  usePendingImport.setState({ pending: undefined });
  useMyRecipes.setState({ recipes: {} });
  mockAllowed.mockReturnValue(true);
});

describe('starting a recipe from a name', () => {
  it('trims the name, and a blank one starts blank', () => {
    expect(startingDraft('  Soup ').title).toBe('Soup');
    expect(startingDraft('   ')).toBe(EMPTY_DRAFT);
    expect(startingDraft(undefined)).toBe(EMPTY_DRAFT);
  });

  it('fills the title, and Cancel asks first', async () => {
    await render(<RecipeEditorScreen id={undefined} fromImport={false} startTitle="Nan’s lentil soup" />);
    expect(screen.getByTestId('editor-title').props.value).toBe('Nan’s lentil soup');
    await fireEvent.press(screen.getByTestId('editor-cancel'));
    expect(screen.getByText('Throw away your changes?')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('an import waiting for review wins over the name', async () => {
    usePendingImport.setState({ pending: { draft: { ...EMPTY_DRAFT, title: 'Leek pie' }, url: 'https://example.com/pie' } });
    await render(<RecipeEditorScreen id={undefined} fromImport startTitle="Soup" />);
    expect(screen.getByTestId('editor-title').props.value).toBe('Leek pie');
  });
});

describe('the free allowance (F-8)', () => {
  it('a new recipe past the allowance opens the paywall and keeps the draft', async () => {
    mockAllowed.mockReturnValue(false);
    await render(<RecipeEditorScreen id={undefined} fromImport={false} startTitle="Soup" />);
    await fireEvent.press(screen.getByTestId('editor-save'));
    await fireEvent.press(screen.getByTestId('editor-save-draft'));
    expect(mockAllowed).toHaveBeenCalledWith('my-recipes');
    expect(Object.keys(useMyRecipes.getState().recipes)).toHaveLength(0);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('editor-title').props.value).toBe('Soup');
  });
  it('within the allowance it saves as before', async () => {
    await render(<RecipeEditorScreen id={undefined} fromImport={false} startTitle="Soup" />);
    await fireEvent.press(screen.getByTestId('editor-save'));
    await fireEvent.press(screen.getByTestId('editor-save-draft'));
    expect(Object.keys(useMyRecipes.getState().recipes)).toHaveLength(1);
  });
});
