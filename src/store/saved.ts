// Saved recipes: bookmarks, named collections, hidden dishes and recently viewed.
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
  /** Saved or not, whatever it was: Undo sets the old value rather than toggling, so it can't redo by mistake. */
  setBookmark: (recipeId: string, saved: boolean) => void;
  /** Puts a removed bookmark back where its date says, not at the top with a new date. */
  restoreBookmark: (bookmark: Bookmark) => void;
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => Collection | undefined;
  restoreCollection: (collection: Collection) => void;
  toggleInCollection: (collectionId: string, recipeId: string) => boolean;
  toggleHidden: (recipeId: string) => boolean;
  setHidden: (recipeId: string, hidden: boolean) => void;
  recordView: (recipeId: string) => void;
  /** Empties Recently viewed and returns what was there, for undo. */
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
      setBookmark: (recipeId, saved) => {
        if (get().bookmarks.some((b) => b.recipeId === recipeId) !== saved) get().toggleBookmark(recipeId);
      },
      restoreBookmark: (bookmark) =>
        set((s) => {
          const rest = s.bookmarks.filter((b) => b.recipeId !== bookmark.recipeId);
          // Newest first, so it goes in before the first one saved earlier than it.
          const at = rest.findIndex((b) => b.savedAt < bookmark.savedAt);
          return { bookmarks: at < 0 ? [...rest, bookmark] : [...rest.slice(0, at), bookmark, ...rest.slice(at)] };
        }),
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
      setHidden: (recipeId, hidden) => {
        if (get().hidden.includes(recipeId) !== hidden) get().toggleHidden(recipeId);
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
      ...savedAs<SavedState>('saved', 1),
      storage: persistentStorage(),
      partialize: ({ bookmarks, collections, hidden, recentlyViewed }) => ({ bookmarks, collections, hidden, recentlyViewed }),
    },
  ),
);
