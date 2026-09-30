// A garbled or stale /recipe/<id>/collect link can't file an id that resolves
// to nothing into a collection (audit F144).
import { render, screen } from '@testing-library/react-native';

import { CollectSheet } from './CollectSheet';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true }) }));
// The first render loads the whole catalogue.
jest.setTimeout(30_000);

test('a recipe that doesn’t exist gets a message, not the collection controls', async () => {
  await render(<CollectSheet id="not-a-real-recipe" />);
  expect(screen.getByText('This recipe isn’t available any more.')).toBeTruthy();
  expect(screen.queryByTestId('collect-create')).toBeNull();
});

test('a real recipe offers its collections', async () => {
  await render(<CollectSheet id="chicken-burrito-bowl" />);
  expect(screen.getByTestId('collect-create')).toBeTruthy();
});
