// Chips say what kind of control they are: a toggle, one choice of several, or an
// action. Action chips read "Add rice", not "+ rice, checkbox" (audit F102, F174).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';
import { ListRow } from './ListRow';

test('a toggle chip is a checkbox with its state', async () => {
  await render(<Chip label="Vegetarian" selected onPress={() => {}} />);
  expect(screen.getByRole('checkbox', { name: 'Vegetarian', checked: true })).toBeTruthy();
});

test('a single-choice chip is a radio', async () => {
  await render(<Chip role="radio" label="Pescatarian" selected={false} onPress={() => {}} />);
  expect(screen.getByRole('radio', { name: 'Pescatarian', checked: false })).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('an action chip is a button named for what it does, not its glyph', async () => {
  const onPress = jest.fn();
  await render(<Chip role="button" label="coriander ×" accessibilityLabel="Remove coriander" selected onPress={onPress} />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Remove coriander' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a list row reads its detail line too, and a blank title still has a name', async () => {
  await render(<ListRow title="Weeknights" detail="12 recipes" value="Shared" onPress={() => {}} />);
  expect(screen.getByRole('button', { name: 'Weeknights, 12 recipes, Shared' })).toBeTruthy();
  await render(<ListRow title="  " onPress={() => {}} />);
  expect(screen.getByRole('button', { name: 'Untitled' })).toBeTruthy();
  expect(screen.getByText('Untitled')).toBeTruthy();
});
