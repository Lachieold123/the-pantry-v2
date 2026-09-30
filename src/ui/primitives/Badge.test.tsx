import { render, screen } from '@testing-library/react-native';

import { Badge } from './Badge';

describe('Badge', () => {
  it('is hidden at zero, so an empty plan shows no number', async () => {
    await render(<Badge count={0} />);
    expect(screen.queryByText('0', { includeHiddenElements: true })).toBeNull();
  });

  // The badge is hidden from screen readers; the tab or row it sits on says the number.
  it('caps long counts', async () => {
    await render(<Badge count={120} kind="ink" size="medium" />);
    expect(screen.getByText('99+', { includeHiddenElements: true })).toBeTruthy();
  });
});
