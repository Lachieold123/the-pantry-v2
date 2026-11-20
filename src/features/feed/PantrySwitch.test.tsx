// A three-digit count shows as "99+" so the label keeps its room (UX-18); the spoken label keeps the number.
import { render, screen } from '@testing-library/react-native';

import { PantrySwitch } from './PantrySwitch';

it('caps the badge at 99+ and still says the real number', async () => {
  await render(<PantrySwitch mode="pantry" onMode={jest.fn()} ready={123} stocked={40} onCupboard={jest.fn()} onSearch={jest.fn()} />);
  expect(screen.getByText('99+')).toBeTruthy();
  expect(screen.getByLabelText('What I have, 123 dishes ready')).toBeTruthy();
});
