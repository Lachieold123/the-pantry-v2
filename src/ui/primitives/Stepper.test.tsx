import { fireEvent, render, screen } from '@testing-library/react-native';

import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('steps within its limits', async () => {
    const onChange = jest.fn();
    await render(<Stepper label="Servings" value={1} min={1} max={12} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More servings' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    // At the minimum, the minus button is disabled rather than doing nothing silently.
    expect(screen.getByRole('button', { name: 'Fewer servings' })).toBeDisabled();
  });
});
