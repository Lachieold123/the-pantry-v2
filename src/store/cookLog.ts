// Every time a recipe is cooked. "Has this been cooked?" is derived from here.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CookEvent } from '@/domain/cook/cook';
import { newId } from '@/lib/ids';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type CookLogState = {
  log: CookEvent[];
  markCooked: (recipeId: string) => CookEvent;
  undo: (eventId: string) => void;
};

export const useCookLog = create<CookLogState>()(
  persist(
    (set) => ({
      log: [],
      markCooked: (recipeId) => {
        const event: CookEvent = { id: newId(), recipeId, cookedAt: Date.now() };
        set((s) => ({ log: [...s.log, event] }));
        return event;
      },
      undo: (eventId) => set((s) => ({ log: s.log.filter((e) => e.id !== eventId) })),
    }),
    { name: `${STORAGE_PREFIX}/cook-log`, version: 1, storage: persistentStorage, partialize: ({ log }) => ({ log }) },
  ),
);
