// Saving and unsaving a recipe from anywhere: the recipe page and every card's
// bookmark share one toast with an Undo that puts things back exactly as they were.
import { useCallback, useMemo } from 'react';

import { useSaved } from '@/store/saved';
import { useToast } from './toastContext';

/**
 * Save or unsave with a toast whose Undo puts it back exactly as it was (same
 * place in Cookmarks). Shared by the recipe page and every card's bookmark, so
 * an unsave is never silent. Cards skip the toast on save: the filled bookmark says it.
 */
export function useToggleBookmark({ toastOnSave }: { toastOnSave: boolean }): (recipeId: string) => boolean {
  const toast = useToast();
  return useCallback(
    (recipeId: string) => {
      const { bookmarks, toggleBookmark, setBookmark, restoreBookmark } = useSaved.getState();
      const before = bookmarks.find((b) => b.recipeId === recipeId);
      const nowSaved = toggleBookmark(recipeId);
      if (nowSaved && toastOnSave) toast({ message: 'Saved to Cookmarks', undo: () => setBookmark(recipeId, false) });
      if (!nowSaved && before) toast({ message: 'Removed from Cookmarks', undo: () => restoreBookmark(before) });
      return nowSaved;
    },
    [toast, toastOnSave],
  );
}

/** For card grids: whether a recipe is saved, and a toggle. Re-renders only when bookmarks change. */
export function useBookmarks(): { isSaved: (id: string) => boolean; toggle: (id: string) => void } {
  const bookmarks = useSaved((s) => s.bookmarks);
  const toggle = useToggleBookmark({ toastOnSave: false });
  // Memoised so the functions keep their identity between renders: memoised
  // cards then redraw only when bookmarks actually change.
  const isSaved = useMemo(() => {
    const ids = new Set(bookmarks.map((b) => b.recipeId));
    return (id: string) => ids.has(id);
  }, [bookmarks]);
  const toggleSaved = useCallback((id: string) => void toggle(id), [toggle]);
  return useMemo(() => ({ isSaved, toggle: toggleSaved }), [isSaved, toggleSaved]);
}
