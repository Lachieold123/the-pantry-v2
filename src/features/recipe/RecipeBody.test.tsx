import { render, screen } from '@testing-library/react-native';

import type { Recipe } from '@/domain/recipes/types';
import { Method } from './RecipeBody';

const recipe = {
  id: 'roast',
  title: 'Roast',
  steps: [{ text: 'Heat the oven to 200°C.' }, { text: 'Roast for 1 hour 15 minutes.' }],
} as unknown as Recipe;

describe('Method', () => {
  it('shows oven temperatures in °F for imperial cooks (F49)', async () => {
    await render(<Method recipe={recipe} units="imperial" />);
    expect(screen.getByLabelText('Step 1. Heat the oven to 390°F.')).toBeTruthy();
  });

  it('leaves metric steps as written, with one timer for a compound time', async () => {
    await render(<Method recipe={recipe} units="metric" />);
    expect(screen.getByLabelText('Step 1. Heat the oven to 200°C.')).toBeTruthy();
    expect(screen.getByText(' 1 hour 15 minutes ')).toBeTruthy();
  });
});
