// VoiceOver reads a recipe card as one element, so the bookmark disc inside it
// can't be reached; saving is a card action instead (audit F98).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CATALOGUE } from '@/data/catalogue/catalogue';
import { RecipeCard } from './RecipeCard';

const recipe = CATALOGUE[0]!;

test.each(['medium', 'large'] as const)('a %s card offers Save as an action that saves', async (size) => {
  const onToggleSave = jest.fn();
  const onPress = jest.fn();
  await render(<RecipeCard recipe={recipe} image={undefined} size={size} onPress={onPress} saved={false} onToggleSave={onToggleSave} />);
  const card = screen.getByTestId(`recipe-card-${recipe.id}`);
  expect(card.props.accessibilityActions).toEqual([{ name: 'save', label: 'Save' }]);
  await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'save' } });
  expect(onToggleSave).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
});

test('a saved card says so, and its action removes it', async () => {
  await render(<RecipeCard recipe={recipe} image={undefined} size="medium" onPress={() => {}} saved onToggleSave={() => {}} />);
  const card = screen.getByTestId(`recipe-card-${recipe.id}`);
  expect(card.props.accessibilityLabel).toMatch(/, saved$/);
  expect(card.props.accessibilityActions).toEqual([{ name: 'save', label: 'Remove from saved' }]);
});

test('a card that can’t save offers no action', async () => {
  await render(<RecipeCard recipe={recipe} image={undefined} size="medium" onPress={() => {}} />);
  expect(screen.getByTestId(`recipe-card-${recipe.id}`).props.accessibilityActions).toBeUndefined();
});
