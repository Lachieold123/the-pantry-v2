// Ingredient ticks belong to the line, not its position, and an edited recipe
// starts with none (audit F50). Group headings show (F169).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Recipe } from '@/domain/recipes/types';
import { Ingredients } from './RecipeBody';

const line = (item: string) => ({ item, raw: item });
const base: Recipe = {
  id: 'test',
  title: 'Test',
  cuisine: 'australian',
  servings: 2,
  ingredientGroups: [
    { title: 'Mash', items: [line('butter'), line('potatoes')] },
    { title: 'Gravy', items: [line('flour')] },
  ],
  steps: [{ text: 'Cook.' }],
  source: 'house',
} as unknown as Recipe;

const none = new Set<string>();
const checked = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.checked ?? screen.getByTestId(testID).props['aria-checked'];

test('shows group headings and capitalised lines', async () => {
  await render(<Ingredients recipe={base} servings={2} units="metric" have={none} />);
  expect(screen.getByText('Mash')).toBeTruthy();
  expect(screen.getByText('Gravy')).toBeTruthy();
  expect(screen.getByText('Butter')).toBeTruthy();
});

test('a tick follows its line when lines move', async () => {
  const { rerender } = await render(<Ingredients recipe={base} servings={2} units="metric" have={none} />);
  await fireEvent.press(screen.getByTestId('ingredient-0-0'));
  expect(checked('ingredient-0-0')).toBe(true);

  // Same lines, butter now second: the tick moves with the butter, not the slot.
  const [butter, potatoes] = base.ingredientGroups[0]!.items;
  const moved = { ...base, ingredientGroups: [{ title: 'Mash', items: [potatoes!, butter!] }, base.ingredientGroups[1]!] };
  await rerender(<Ingredients recipe={moved} servings={2} units="metric" have={none} />);
  expect(checked('ingredient-0-0')).toBe(false);
  expect(checked('ingredient-0-1')).toBe(true);
});

test('an edited recipe (new lines) starts unticked', async () => {
  const { rerender } = await render(<Ingredients recipe={base} servings={2} units="metric" have={none} />);
  await fireEvent.press(screen.getByTestId('ingredient-0-0'));
  const edited = { ...base, ingredientGroups: base.ingredientGroups.map((g) => ({ ...g, items: g.items.map((l) => ({ ...l })) })) };
  await rerender(<Ingredients recipe={edited} servings={2} units="metric" have={none} />);
  expect(checked('ingredient-0-0')).toBe(false);
});
