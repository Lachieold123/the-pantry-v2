// What's in the cupboard (presence only, D-010), what's always on your shelf,
// and whether ticked shopping moves in.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_SHELF, type Shelf } from '@/domain/cupboard/cookable';
import { addToCupboard, type CupboardItem } from '@/domain/cupboard/match';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type CupboardState = {
  items: CupboardItem[];
  shelf: Shelf;
  moveTickedToCupboard: boolean;
  add: (ids: string[], source: CupboardItem['source']) => void;
  remove: (ingredientId: string) => void;
  /** Empties the cupboard and returns what was there, for undo. */
  clear: () => CupboardItem[];
  /**
   * Undo: puts these back, keeping anything added since (a household member's
   * jar, say). Never a snapshot that wipes newer changes (BUG-18).
   */
  restore: (items: CupboardItem[]) => void;
  /** Undo an add: takes out just these, if they're still the ones that add put in. */
  takeBack: (added: readonly CupboardItem[]) => void;
  setShelf: (shelf: Shelf) => void;
  setMoveTicked: (on: boolean) => void;
};

export const useCupboard = create<CupboardState>()(
  persist(
    (set, get) => ({
      items: [],
      shelf: DEFAULT_SHELF,
      moveTickedToCupboard: true,
      add: (ids, source) => set((s) => ({ items: addToCupboard(s.items, ids, source, Date.now()) })),
      remove: (ingredientId) => set((s) => ({ items: s.items.filter((i) => i.ingredientId !== ingredientId) })),
      clear: () => {
        const was = get().items;
        set({ items: [] });
        return was;
      },
      restore: (items) =>
        set((s) => {
          const have = new Set(s.items.map((i) => i.ingredientId));
          return { items: [...s.items, ...items.filter((i) => !have.has(i.ingredientId))] };
        }),
      takeBack: (added) =>
        set((s) => {
          const mine = new Set(added.map((i) => `${i.ingredientId}|${i.addedAt}`));
          return { items: s.items.filter((i) => !mine.has(`${i.ingredientId}|${i.addedAt}`)) };
        }),
      setShelf: (shelf) => set({ shelf }),
      setMoveTicked: (moveTickedToCupboard) => set({ moveTickedToCupboard }),
    }),
    {
      name: `${STORAGE_PREFIX}/cupboard`,
      version: 2,
      storage: persistentStorage(),
      partialize: ({ items, shelf, moveTickedToCupboard }) => ({ items, shelf, moveTickedToCupboard }),
      // Version 2 added the shelf; older saves keep their items and assume a stocked shelf.
      migrate: (saved) => ({ shelf: DEFAULT_SHELF, ...(saved as object) }) as unknown as CupboardState,
    },
  ),
);
