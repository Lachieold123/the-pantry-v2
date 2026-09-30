// Undo puts things back as they were, rather than toggling again (audit F162,
// F203), and unsaving from a card gets the same toast with Undo (F175).
import { act, renderHook } from '@testing-library/react-native';

import { useSaved } from '@/store/saved';
import { useBookmarks, useToggleBookmark } from './useBookmarks';

const mockToast = jest.fn();
jest.mock('./toastContext', () => ({ ...jest.requireActual('./toastContext'), useToast: () => mockToast }));

const ids = () => useSaved.getState().bookmarks.map((b) => b.recipeId);
const lastUndo = (): (() => void) => mockToast.mock.calls.at(-1)?.[0]?.undo;

beforeEach(() => {
  mockToast.mockClear();
  useSaved.setState({
    bookmarks: [
      { recipeId: 'c', savedAt: 3 },
      { recipeId: 'b', savedAt: 2 },
      { recipeId: 'a', savedAt: 1 },
    ],
    hidden: [],
  });
});

test('undoing an unsave puts the bookmark back in its place, with its date', async () => {
  const { result } = await renderHook(() => useToggleBookmark({ toastOnSave: true }));
  await act(() => void result.current('b'));
  expect(ids()).toEqual(['c', 'a']);
  expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Removed from Cookmarks' }));
  await act(() => lastUndo()());
  expect(useSaved.getState().bookmarks).toEqual([
    { recipeId: 'c', savedAt: 3 },
    { recipeId: 'b', savedAt: 2 },
    { recipeId: 'a', savedAt: 1 },
  ]);
});

test('undo after another change sets the old value instead of flipping it', async () => {
  const { result } = await renderHook(() => useToggleBookmark({ toastOnSave: true }));
  await act(() => void result.current('d'));
  const undoSave = lastUndo();
  // Unsaved again some other way before tapping Undo: Undo must not save it back.
  await act(() => void useSaved.getState().toggleBookmark('d'));
  await act(() => undoSave());
  expect(ids()).not.toContain('d');

  useSaved.getState().toggleHidden('x');
  useSaved.getState().setHidden('x', false);
  useSaved.getState().setHidden('x', false);
  expect(useSaved.getState().hidden).toEqual([]);
});

test('unsaving from a card is announced with Undo; saving from a card is quiet', async () => {
  const { result } = await renderHook(() => useBookmarks());
  await act(() => result.current.toggle('d'));
  expect(mockToast).not.toHaveBeenCalled();
  await act(() => result.current.toggle('a'));
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ message: 'Removed from Cookmarks', undo: expect.any(Function) }));
  await act(() => lastUndo()());
  expect(ids()).toEqual(['d', 'c', 'b', 'a']);
});
