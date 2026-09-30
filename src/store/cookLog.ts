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
  /** Empties the log and returns it, so the clear can be undone. */
  clearLog: () => CookEvent[];
  restoreLog: (events: readonly CookEvent[]) => void;
};

export const useCookLog = create<CookLogState>()(
  persist(
    (set, get) => ({
      log: [],
      markCooked: (recipeId) => {
        const event: CookEvent = { id: newId(), recipeId, cookedAt: Date.now() };
        set((s) => ({ log: [...s.log, event] }));
        return event;
      },
      undo: (eventId) => set((s) => ({ log: s.log.filter((e) => e.id !== eventId) })),
      clearLog: () => {
        const cleared = get().log;
        set({ log: [] });
        return cleared;
      },
      // Cooks logged since the clear are kept; the log stays in time order.
      restoreLog: (events) =>
        set((s) => {
          const have = new Set(s.log.map((e) => e.id));
          return { log: [...s.log, ...events.filter((e) => !have.has(e.id))].sort((a, b) => a.cookedAt - b.cookedAt) };
        }),
    }),
    { name: `${STORAGE_PREFIX}/cook-log`, version: 1, storage: persistentStorage(), partialize: ({ log }) => ({ log }) },
  ),
);
