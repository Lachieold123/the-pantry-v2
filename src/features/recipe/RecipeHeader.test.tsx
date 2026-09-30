// The "Tested in The Pantry kitchen" line is a promise, so it shows only on a
// recipe marked vetted in the catalogue, never on a draft or your own recipe (F151).
import { render, screen } from '@testing-library/react-native';

import type { Recipe } from '@/domain/recipes/types';
import { RecipeHeader } from './RecipeHeader';

const base = {
  id: 'test',
  title: 'Test',
  cuisine: 'australian',
  difficulty: 'easy',
  prepMinutes: 5,
  cookMinutes: 10,
  servings: 2,
  ingredientGroups: [],
  steps: [{ text: 'Cook.' }],
  source: 'house',
} as unknown as Recipe;

const noop = () => undefined;
const header = (recipe: Recipe, mine = false) => (
  <RecipeHeader
    recipe={recipe}
    mine={mine}
    saved={false}
    cooked={false}
    servings={2}
    onEdit={noop}
    onSave={noop}
    onPlan={noop}
    onShare={noop}
    onMarkCooked={noop}
    onServings={noop}
    onCook={noop}
  />
);

test('a vetted recipe says it was tested in The Pantry kitchen', async () => {
  await render(header({ ...base, provenance: 'vetted' }));
  expect(screen.getByText('Tested in The Pantry kitchen')).toBeTruthy();
});

test('a draft makes no such claim', async () => {
  await render(header({ ...base, provenance: 'ai-draft' }));
  expect(screen.queryByTestId('recipe-vetted')).toBeNull();
});

test('your own recipe makes no such claim, even if marked vetted', async () => {
  await render(header({ ...base, provenance: 'vetted' }, true));
  expect(screen.queryByTestId('recipe-vetted')).toBeNull();
});
