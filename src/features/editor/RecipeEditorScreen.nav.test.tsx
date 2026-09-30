// The editor's ways out, on a real expo-router stack shaped like the app's.
// F56: "Save to finish later" and Delete close the editor, rather than
// stacking My recipes on top of it. F208: Android/browser Back with unsaved
// changes asks first, and Discard then leaves.
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, Tabs, router, useLocalSearchParams } from 'expo-router';
import { store } from 'expo-router/build/global-state/store';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { EMPTY_DRAFT } from '@/domain/recipes/draft';
import { useMyRecipes } from '@/store/myRecipes';
import { RecipeEditorScreen } from './RecipeEditorScreen';

jest.setTimeout(30_000);

type StackState = { index: number; routes: { name: string; state?: StackState }[] };
const names = () => {
  const state = store.navigationRef.getRootState() as unknown as StackState;
  const inner = state.routes[0]?.name === '__root' ? state.routes[0].state! : state;
  return inner.routes.map((r) => r.name);
};

function EditRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <RecipeEditorScreen id={id} fromImport={false} />;
}
const routes = {
  _layout: { default: () => <Stack />, unstable_settings: { anchor: '(tabs)' } },
  '(tabs)/_layout': () => <Tabs />,
  '(tabs)/index': () => <Text>feed</Text>,
  'my-recipes': () => <Text>my recipes</Text>,
  'recipe/[id]/index': () => <Text>recipe</Text>,
  'my-recipe/edit': EditRoute,
};

async function go(fn: () => void) {
  await act(async () => fn());
  await act(async () => {});
}
async function openEditor(path: string[]) {
  await renderRouter(routes, { initialUrl: '/' });
  await act(async () => {});
  for (const p of path) await go(() => router.push(p as never));
}

beforeEach(() => useMyRecipes.setState({ recipes: {} }));

test('"Save to finish later" closes the editor and lands on My recipes underneath (F56)', async () => {
  await openEditor(['/my-recipes', '/my-recipe/edit']);
  await fireEvent.changeText(screen.getByTestId('editor-title'), 'Nan’s lentil soup');
  await fireEvent.press(screen.getByTestId('editor-save'));
  await go(() => fireEvent.press(screen.getByTestId('editor-save-draft')));
  expect(names()).toEqual(['(tabs)', 'my-recipes']);
  expect(Object.keys(useMyRecipes.getState().recipes)).toHaveLength(1);
});

test('Delete from a recipe page closes the editor and opens My recipes (F56)', async () => {
  useMyRecipes.getState().save({ id: 'mine-soup', draft: { ...EMPTY_DRAFT, title: 'Soup' }, source: 'user' });
  await openEditor(['/recipe/mine-soup', '/my-recipe/edit?id=mine-soup']);
  await fireEvent.press(screen.getByTestId('editor-delete'));
  await go(() => fireEvent.press(screen.getByTestId('editor-confirm-delete')));
  expect(names()).not.toContain('my-recipe/edit');
  expect(names().at(-1)).toBe('my-recipes');
});

test('Back with unsaved changes asks first; Discard then leaves (F208)', async () => {
  await openEditor(['/my-recipes', '/my-recipe/edit']);
  await fireEvent.changeText(screen.getByTestId('editor-title'), 'Half-typed');
  await go(() => router.back());
  expect(names().at(-1)).toBe('my-recipe/edit');
  expect(screen.getByText('Throw away your changes?')).toBeTruthy();
  await go(() => fireEvent.press(screen.getByTestId('editor-discard')));
  expect(names()).toEqual(['(tabs)', 'my-recipes']);
});

test('Back with nothing typed just leaves (F208)', async () => {
  await openEditor(['/my-recipes', '/my-recipe/edit']);
  await go(() => router.back());
  expect(names()).toEqual(['(tabs)', 'my-recipes']);
});
