import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows its message and runs its one next step', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState title="Nothing planned for tonight" body="Plan a few dinners." action={{ label: 'Browse recipes', onPress }} />,
    );
    expect(screen.getByText('Nothing planned for tonight')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Browse recipes' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is no action', async () => {
    await render(<EmptyState title="Your cupboard is empty" body="Add what you have." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
