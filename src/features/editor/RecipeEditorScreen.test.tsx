// The editor's save: one tap, one recipe (audit F60); a finished recipe is never
// parked as a draft (F54); and a crafted id is never a recipe (F62).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EMPTY_DRAFT, type RecipeDraft } from '@/domain/recipes/draft';
import { useMyRecipes } from '@/store/myRecipes';
import { usePendingImport } from '@/store/pendingImport';
import { RecipeEditorScreen } from './RecipeEditorScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  dismiss: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useNavigation: () => ({ dispatch: jest.fn() }) }));
// The leave guard's real behaviour is covered in RecipeEditorScreen.nav.test.tsx.
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => undefined }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const fade = { duration: () => fade };
  return { __esModule: true, default: { View }, FadeIn: fade, FadeInDown: fade, FadeOutDown: fade, useReducedMotion: () => true };
});
jest.setTimeout(30_000);

const FINISHED: RecipeDraft = {
  ...EMPTY_DRAFT,
  title: 'Nan’s lentil soup',
  cuisine: 'british',
  ingredientsText: '1 cup red lentils\n1 brown onion',
  methodText: 'Soften the onion.\nSimmer.',
};

beforeEach(() => {
  useMyRecipes.setState({ recipes: {} });
  Object.values(mockRouter).forEach((f) => f.mockClear());
});

test('a double tap on Save stores one recipe, not two', async () => {
  usePendingImport.getState().set({ draft: FINISHED, url: 'https://example.com/soup' });
  await render(<RecipeEditorScreen id={undefined} fromImport />);
  const save = screen.getByTestId('editor-save');
  await fireEvent.press(save);
  await fireEvent.press(save);
  const ids = Object.keys(useMyRecipes.getState().recipes);
  expect(ids).toHaveLength(1);
  expect(ids[0]).toMatch(/^my-nan-s-lentil-soup-[a-z0-9]+$/);
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

test('saving a new recipe never overwrites one with the same id', () => {
  const { save } = useMyRecipes.getState();
  expect(save({ id: 'my-soup-1', draft: FINISHED, source: 'user' }, { isNew: true })).toBe(true);
  expect(save({ id: 'my-soup-1', draft: { ...FINISHED, title: 'Other' }, source: 'user' }, { isNew: true })).toBe(false);
  expect(useMyRecipes.getState().recipes['my-soup-1']?.draft.title).toBe('Nan’s lentil soup');
});

test('a finished recipe edited into an unfinished one offers Discard changes, not a draft save', async () => {
  useMyRecipes.getState().save({ id: 'my-soup-1', draft: FINISHED, source: 'user' });
  await render(<RecipeEditorScreen id="my-soup-1" fromImport={false} />);
  await fireEvent.changeText(screen.getByTestId('editor-method'), '');
  await fireEvent.press(screen.getByTestId('editor-save'));
  expect(screen.queryByTestId('editor-save-draft')).toBeNull();
  await fireEvent.press(screen.getByTestId('editor-discard-changes'));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(useMyRecipes.getState().recipes['my-soup-1']?.draft.methodText).toBe(FINISHED.methodText);
});

test('an unfinished recipe can still be saved to finish later', async () => {
  useMyRecipes.getState().save({ id: 'my-soup-1', draft: { ...FINISHED, methodText: '' }, source: 'user' });
  await render(<RecipeEditorScreen id="my-soup-1" fromImport={false} />);
  await fireEvent.press(screen.getByTestId('editor-save'));
  expect(screen.getByTestId('editor-save-draft')).toBeTruthy();
});

test('the almost-there note keeps the capitals in the cook’s own words', async () => {
  useMyRecipes.getState().save({ id: 'my-soup-1', draft: { ...FINISHED, cuisine: undefined }, source: 'user' });
  await render(<RecipeEditorScreen id="my-soup-1" fromImport={false} />);
  await fireEvent.press(screen.getByTestId('editor-save'));
  expect(screen.getByText('Almost there: pick the closest cuisine.')).toBeTruthy();
});

test('an id like "constructor" is not an existing recipe', async () => {
  await render(<RecipeEditorScreen id="constructor" fromImport={false} />);
  expect(screen.getByTestId('editor-missing')).toBeTruthy();
  expect(useMyRecipes.getState().remove('constructor')).toBeUndefined();
});
