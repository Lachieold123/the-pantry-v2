// Ingredient ticks belong to the line, not its position, and an edited recipe
// starts with none (audit F50). Group headings show (F169).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Recipe } from '@/domain/recipes/types';
import { RECIPE } from '@/ui/tokens/type';
import { Ingredients, Method } from './RecipeBody';

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

const roast = {
  id: 'roast',
  title: 'Roast',
  steps: [{ text: 'Heat the oven to 200°C.' }, { text: 'Roast for 1 hour 15 minutes.' }],
} as unknown as Recipe;

describe('Method', () => {
  it('shows oven temperatures in °F for imperial cooks (F49)', async () => {
    await render(<Method recipe={roast} units="imperial" />);
    expect(screen.getByLabelText('Step 1. Heat the oven to 390°F.')).toBeTruthy();
  });

  it('leaves metric steps as written, with one timer for a compound time', async () => {
    await render(<Method recipe={roast} units="metric" />);
    expect(screen.getByLabelText('Step 1. Heat the oven to 200°C.')).toBeTruthy();
    // Non-breaking spaces, so the chip never splits across lines (F112).
    expect(screen.getByText('\u00A01\u00A0hour\u00A015\u00A0minutes\u00A0')).toBeTruthy();
  });

  it('keeps a range together too, with no break after its dash (F112)', async () => {
    await render(<Method recipe={{ ...roast, steps: [{ text: 'Bake for 35–40 minutes.' }] } as Recipe} units="metric" />);
    expect(screen.getByText('\u00A035–\u206040\u00A0minutes\u00A0')).toBeTruthy();
  });

  it('gives two-digit step numbers room to stay on one line (F93)', async () => {
    const long = { ...roast, steps: Array.from({ length: 12 }, (_, i) => ({ text: `Step ${i + 1}.` })) } as Recipe;
    await render(<Method recipe={long} units="metric" />);
    const twelve = screen.getByText('12');
    expect(twelve.props.numberOfLines).toBe(1);
    expect(twelve.props.style).toEqual(expect.arrayContaining([{ width: RECIPE.stepNumberWide }]));
  });

  it('heads the steps "Method", as the editor does (F173)', async () => {
    await render(<Method recipe={roast} units="metric" />);
    expect(screen.getByText('Method :')).toBeTruthy();
  });
});
