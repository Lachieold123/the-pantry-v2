// Someone avoiding nuts opens a typed recipe with "nutella" in it: the page
// names what it couldn't check rather than implying the recipe is safe (F-3).
import { render, screen } from '@testing-library/react-native';

import { parseIngredientLine } from '@/domain/ingredients/parse';
import { usePreferences } from '@/store/preferences';
import { AvoidNote } from './AvoidNote';

const recipe = (lines: string[]) => ({ ingredientGroups: [{ items: lines.map((l) => parseIngredientLine(l).line) }] });

afterEach(() => usePreferences.setState({ avoid: { options: [], custom: [] } }));

it('names the ingredients it could not check against the avoid list', async () => {
  usePreferences.setState({ avoid: { options: ['nuts'], custom: [] } });
  await render(<AvoidNote recipe={recipe(['2 tbsp nutella', '100 g marzipan'])} />);
  expect(
    screen.getByText("We couldn't check 2 ingredients against your avoid list: nutella, marzipan. Check the labels before you cook."),
  ).toBeTruthy();
});

it('says so when the recipe has something on the avoid list', async () => {
  usePreferences.setState({ avoid: { options: [], custom: ['nutella'] } });
  await render(<AvoidNote recipe={recipe(['2 tbsp nutella'])} />);
  expect(screen.getByText('This recipe has something on your avoid list.')).toBeTruthy();
});

it('shows nothing without an avoid list', async () => {
  await render(<AvoidNote recipe={recipe(['2 tbsp nutella'])} />);
  expect(screen.queryByTestId('avoid-note')).toBeNull();
});
