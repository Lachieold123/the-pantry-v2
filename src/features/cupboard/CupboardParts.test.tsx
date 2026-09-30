// The cupboard search tells "we don't know that" apart from "that's always
// assumed" (audit F139), and marks what you already have.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddBar } from './CupboardParts';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.setTimeout(30_000);

const search = (text: string) => fireEvent.changeText(screen.getByTestId('cupboard-search'), text);

test('a staple says it is always assumed', async () => {
  await render(<AddBar have={new Set()} onAdd={jest.fn()} />);
  await search('salt');
  expect(screen.getByTestId('cupboard-search-staple').props.children).toBe('Salt is always assumed, so there’s no need to add it.');
});

test('something unknown says so', async () => {
  await render(<AddBar have={new Set()} onAdd={jest.fn()} />);
  await search('unobtainium');
  expect(screen.getByText('No ingredient by that name. Try a simpler word, like “rice”.')).toBeTruthy();
});
