import { act, render, screen } from '@testing-library/react-native';

import { usePreferences } from '@/store/preferences';
import { FoodSettings } from './FoodSettings';

describe('FoodSettings', () => {
  // Generous: the first run loads and matches the whole catalogue.
  it('says how many recipes each avoid word hides (F136)', async () => {
    await render(<FoodSettings />);
    expect(screen.queryByTestId('settings-avoid-reach')).toBeNull();
    await act(async () => usePreferences.getState().addAvoidWord('olives'));
    // Kalamata and green olives only (about a dozen dishes): olive oil doesn't count.
    const line = (await screen.findByTestId('settings-avoid-reach')).props.children as string;
    const hides = Number(/^“olives” hides (\d+) recipes\.$/.exec(line)?.[1]);
    expect(hides).toBeGreaterThan(0);
    expect(hides).toBeLessThan(40);
  }, 30000);
});
