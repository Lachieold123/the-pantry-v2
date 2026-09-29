// What's in the cupboard (presence only, D-010), and whether ticked shopping moves in.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { addToCupboard, type CupboardItem } from '@/domain/cupboard/match';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type CupboardState = {
  items: CupboardItem[];
  moveTickedToCupboard: boolean;
  add: (ids: string[], source: CupboardItem['source']) => void;
  remove: (ingredientId: string) => void;
  setMoveTicked: (on: boolean) => void;
};

export const useCupboard = create<CupboardState>()(
  persist(
    (set) => ({
      items: [],
      moveTickedToCupboard: true,
      add: (ids, source) => set((s) => ({ items: addToCupboard(s.items, ids, source, Date.now()) })),
      remove: (ingredientId) => set((s) => ({ items: s.items.filter((i) => i.ingredientId !== ingredientId) })),
      setMoveTicked: (moveTickedToCupboard) => set({ moveTickedToCupboard }),
    }),
    {
      name: `${STORAGE_PREFIX}/cupboard`,
      version: 1,
      storage: persistentStorage,
      partialize: ({ items, moveTickedToCupboard }) => ({ items, moveTickedToCupboard }),
    },
  ),
);
