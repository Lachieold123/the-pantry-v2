// Saved recipes: bookmarks, named collections, hidden dishes and recently viewed.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/lib/ids';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type Bookmark = { recipeId: string; savedAt: number };
export type Collection = { id: string; name: string; recipeIds: string[]; createdAt: number; updatedAt: number };

const RECENT_MAX = 20;

type SavedState = {
  bookmarks: Bookmark[];
  collections: Collection[];
  hidden: string[];
  recentlyViewed: string[];
  toggleBookmark: (recipeId: string) => boolean;
  /** Puts a removed bookmark back where it was (undo), keeping its original date. */
  restoreBookmark: (bookmark: Bookmark) => void;
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => Collection | undefined;
  restoreCollection: (collection: Collection) => void;
  toggleInCollection: (collectionId: string, recipeId: string) => boolean;
  toggleHidden: (recipeId: string) => boolean;
  recordView: (recipeId: string) => void;
  /** Empties Recent and returns what was there, for undo. */
  clearRecent: () => string[];
  restoreRecent: (ids: readonly string[]) => void;
};

export const useSaved = create<SavedState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      collections: [],
      hidden: [],
      recentlyViewed: [],
      toggleBookmark: (recipeId) => {
        const saved = get().bookmarks.some((b) => b.recipeId === recipeId);
        set((s) => ({
          bookmarks: saved ? s.bookmarks.filter((b) => b.recipeId !== recipeId) : [{ recipeId, savedAt: Date.now() }, ...s.bookmarks],
        }));
        return !saved;
      },
      restoreBookmark: (bookmark) =>
        set((s) =>
          s.bookmarks.some((b) => b.recipeId === bookmark.recipeId)
            ? s
            : { bookmarks: [...s.bookmarks, bookmark].sort((a, b) => b.savedAt - a.savedAt) },
        ),
      createCollection: (name) => {
        const id = newId();
        const now = Date.now();
        set((s) => ({ collections: [...s.collections, { id, name: name.trim(), recipeIds: [], createdAt: now, updatedAt: now }] }));
        return id;
      },
      renameCollection: (id, name) =>
        set((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, name: name.trim(), updatedAt: Date.now() } : c)) })),
      deleteCollection: (id) => {
        const removed = get().collections.find((c) => c.id === id);
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
        return removed;
      },
      restoreCollection: (collection) =>
        set((s) =>
          s.collections.some((c) => c.id === collection.id)
            ? s
            : { collections: [...s.collections, collection].sort((a, b) => a.createdAt - b.createdAt) },
        ),
      toggleInCollection: (collectionId, recipeId) => {
        const c = get().collections.find((x) => x.id === collectionId);
        const had = c?.recipeIds.includes(recipeId) ?? false;
        set((s) => ({
          collections: s.collections.map((x) =>
            x.id === collectionId
              ? { ...x, recipeIds: had ? x.recipeIds.filter((r) => r !== recipeId) : [recipeId, ...x.recipeIds], updatedAt: Date.now() }
              : x,
          ),
        }));
        return !had;
      },
      toggleHidden: (recipeId) => {
        const had = get().hidden.includes(recipeId);
        set((s) => ({ hidden: had ? s.hidden.filter((r) => r !== recipeId) : [...s.hidden, recipeId] }));
        return !had;
      },
      recordView: (recipeId) =>
        set((s) => ({ recentlyViewed: [recipeId, ...s.recentlyViewed.filter((r) => r !== recipeId)].slice(0, RECENT_MAX) })),
      clearRecent: () => {
        const cleared = get().recentlyViewed;
        set({ recentlyViewed: [] });
        return cleared;
      },
      // Anything viewed since the clear stays on top; the restored list follows it.
      restoreRecent: (ids) =>
        set((s) => ({
          recentlyViewed: [...s.recentlyViewed, ...ids.filter((id) => !s.recentlyViewed.includes(id))].slice(0, RECENT_MAX),
        })),
    }),
    {
      name: `${STORAGE_PREFIX}/saved`,
      version: 1,
      storage: persistentStorage(),
      partialize: ({ bookmarks, collections, hidden, recentlyViewed }) => ({ bookmarks, collections, hidden, recentlyViewed }),
    },
  ),
);

/** For card grids: whether a recipe is saved, and a toggle. Re-renders only when bookmarks change. */
export function useBookmarks(): { isSaved: (id: string) => boolean; toggle: (id: string) => void } {
  const bookmarks = useSaved((s) => s.bookmarks);
  const toggle = useSaved((s) => s.toggleBookmark);
  const ids = new Set(bookmarks.map((b) => b.recipeId));
  return { isSaved: (id) => ids.has(id), toggle: (id) => void toggle(id) };
}
