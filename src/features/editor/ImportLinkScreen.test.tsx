// Import runs once however it's submitted (audit F167), and a page that
// arrives after the sheet has closed changes nothing (F58).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ImportLinkScreen } from './ImportLinkScreen';
import { usePendingImport } from '@/store/pendingImport';

const mockRouter = { back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.setTimeout(30_000);

const PAGE = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Recipe', name: 'Soup', recipeIngredient: ['1 onion'] })}</script>`;
let finish: (html: string) => void = () => {};
const fetchMock = jest.fn(
  (_url: string, init: { signal: AbortSignal }) =>
    new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      finish = (html) => resolve({ ok: true, status: 200, headers: { get: () => null }, text: async () => html });
    }),
);

beforeEach(() => {
  fetchMock.mockClear();
  Object.values(mockRouter).forEach((f) => f.mockClear());
  usePendingImport.getState().set(undefined);
  global.fetch = fetchMock as unknown as typeof fetch;
});

test('the keyboard’s Go and the button together start one import', async () => {
  await render(<ImportLinkScreen />);
  await fireEvent.changeText(screen.getByTestId('import-link'), 'example.com/soup');
  await fireEvent(screen.getByTestId('import-link'), 'submitEditing');
  await fireEvent(screen.getByTestId('import-link'), 'submitEditing');
  await fireEvent.press(screen.getByTestId('import-submit'));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('import-link').props.editable).toBe(false);
  finish(PAGE);
  await new Promise((r) => setTimeout(r, 0));
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

test('closing the sheet mid-import aborts it, and nothing is replaced', async () => {
  const view = await render(<ImportLinkScreen />);
  await fireEvent.changeText(screen.getByTestId('import-link'), 'example.com/soup');
  await fireEvent(screen.getByTestId('import-link'), 'submitEditing');
  await view.unmount();
  finish(PAGE);
  await new Promise((r) => setTimeout(r, 0));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(usePendingImport.getState().pending).toBeUndefined();
});
