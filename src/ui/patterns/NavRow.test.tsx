import { fireEvent, render, screen } from '@testing-library/react-native';

import { NavRow } from './NavRow';

describe('NavRow', () => {
  it('reads its count aloud and opens its page', async () => {
    const onPress = jest.fn();
    await render(<NavRow icon="saved" label="Cookmarks" count={4} onPress={onPress} testID="you-cookmarks" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cookmarks, 4' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no number when there is nothing there', async () => {
    await render(<NavRow icon="flame" label="Kitchen stats" onPress={() => {}} testID="you-stats" />);
    expect(screen.getByRole('button', { name: 'Kitchen stats' })).toBeTruthy();
  });

  it('shows and reads a value in place of a count', async () => {
    await render(<NavRow icon="people" label="Household" value="Not sharing" onPress={() => {}} testID="you-household" />);
    expect(screen.getByRole('button', { name: 'Household, Not sharing' })).toBeTruthy();
    expect(screen.getByText('Not sharing')).toBeTruthy();
  });
});
