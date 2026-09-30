import { fireEvent, render, screen } from '@testing-library/react-native';

import { DrawerRow } from './DrawerRow';

describe('DrawerRow', () => {
  it('reads its count aloud and opens its page', async () => {
    const onPress = jest.fn();
    await render(<DrawerRow icon="saved" label="Cookmarks" count={4} onPress={onPress} testID="menu-saved" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cookmarks, 4' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no number when there is nothing there', async () => {
    await render(<DrawerRow icon="flame" label="Kitchen stats" onPress={() => {}} testID="menu-stats" />);
    expect(screen.getByRole('button', { name: 'Kitchen stats' })).toBeTruthy();
  });
});
