// Saved recipes: bookmarks, named collections, hidden dishes and recently viewed.
import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { addCollection, collectionNamed, renameCollection } from '@/domain/saved/collections';
import { newId } from '@/lib/ids';
import { persistentStorage, savedAs } from './storage';

export type Bookmark = { recipeId: string; savedAt: number };
export type Collection = { id: string; name: string; recipeIds: string[]; createdAt: number; updatedAt: number };

const RECENT_MAX = 20;

type SavedState = {
  bookmarks: Bookmark[];
  collections: Collection[];
  hidden: string[];
  recentlyViewed: string[];
  toggleBookmark: (recipeId: string) => boolean;
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => Collection | undefined;
  restoreCollection: (collection: Collection) => void;
  toggleInCollection: (collectionId: string, recipeId: string) => boolean;
  toggleHidden: (recipeId: string) => boolean;
  recordView: (recipeId: string) => void;
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
      // Names stay unique (domain/saved/collections): asking for a name that's taken gives back that collection.
      createCollection: (name) => {
        const existing = collectionNamed(get().collections, name);
        if (existing) return existing.id;
        const id = newId();
        const now = Date.now();
        set((s) => ({ collections: addCollection(s.collections, { id, name, recipeIds: [], createdAt: now, updatedAt: now }) }));
        return id;
      },
      renameCollection: (id, name) => set((s) => ({ collections: renameCollection(s.collections, id, name, Date.now()) })),
      deleteCollection: (id) => {
        const removed = get().collections.find((c) => c.id === id);
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
        return removed;
      },
      restoreCollection: (collection) => set((s) => ({ collections: addCollection(s.collections, collection) })),
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
    }),
    {
      ...savedAs<SavedState>('saved', 1),
      storage: persistentStorage(),
      partialize: ({ bookmarks, collections, hidden, recentlyViewed }) => ({ bookmarks, collections, hidden, recentlyViewed }),
    },
  ),
);

/** For card grids: whether a recipe is saved, and a toggle. Re-renders only when bookmarks change. */
export function useBookmarks(): { isSaved: (id: string) => boolean; toggle: (id: string) => void } {
  const bookmarks = useSaved((s) => s.bookmarks);
  const toggle = useSaved((s) => s.toggleBookmark);
  // Memoised so the functions keep their identity between renders: memoised
  // cards then redraw only when bookmarks actually change.
  const isSaved = useMemo(() => {
    const ids = new Set(bookmarks.map((b) => b.recipeId));
    return (id: string) => ids.has(id);
  }, [bookmarks]);
  const toggleSaved = useCallback((id: string) => void toggle(id), [toggle]);
  return useMemo(() => ({ isSaved, toggle: toggleSaved }), [isSaved, toggleSaved]);
}
