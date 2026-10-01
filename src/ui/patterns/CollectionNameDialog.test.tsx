import { fireEvent, render, screen } from '@testing-library/react-native';

import { CollectionNameDialog } from './CollectionNameDialog';

const taken = (name: string) => (name.toLowerCase() === 'weeknights' ? 'You already have a collection with that name.' : undefined);

describe('CollectionNameDialog', () => {
  it('creates with the trimmed name', async () => {
    const onSubmit = jest.fn();
    await render(
      <CollectionNameDialog visible title="New collection" confirmLabel="Create" problem={taken} onSubmit={onSubmit} onClose={jest.fn()} />,
    );
    await fireEvent.changeText(screen.getByTestId('name-dialog-input'), '  Fridays ');
    await fireEvent.press(screen.getByTestId('name-dialog-save'));
    expect(onSubmit).toHaveBeenCalledWith('Fridays');
  });

  it('says why a taken name is refused and won’t save it, or a blank one', async () => {
    const onSubmit = jest.fn();
    await render(
      <CollectionNameDialog visible title="New collection" confirmLabel="Create" problem={taken} onSubmit={onSubmit} onClose={jest.fn()} />,
    );
    await fireEvent.press(screen.getByTestId('name-dialog-save'));
    await fireEvent.changeText(screen.getByTestId('name-dialog-input'), 'WEEKNIGHTS');
    expect(screen.getByText('You already have a collection with that name.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('name-dialog-save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts from the current name when renaming, and cancels', async () => {
    const onClose = jest.fn();
    await render(
      <CollectionNameDialog
        visible
        title="Rename collection"
        confirmLabel="Save"
        initialName="Fridays"
        problem={taken}
        onSubmit={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(screen.getByDisplayValue('Fridays')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('name-dialog-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
