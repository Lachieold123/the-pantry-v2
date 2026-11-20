// The Home engine's interaction log, kept on this phone for now: what was
// shown, opened, read for how long, hidden, and which cooks were followed.
// It feeds the ranking straight away; the server's home_events table
// (supabase/migrations, not applied yet) is where it goes once sync is approved.
//
// `asCookId` is a testing switch: Home ranks as if you were one of the AI
// cooks, with their real follows from the server. Off (undefined) is you.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appendEvent, isEvent } from '@/domain/home-engine/events';
import type { EngineEvent, EventType } from '@/domain/home-engine/types';
import { persistentStorage, STORAGE_PREFIX } from './storage';

/** Everyone on this phone is one viewer until accounts carry an id the server knows. */
export const LOCAL_VIEWER = 'me';

type HomeEventsState = {
  events: EngineEvent[];
  asCookId: string | undefined;
  log: (type: EventType, detail?: { itemId?: string; cookId?: string; seconds?: number; surface?: string }) => void;
  setAsCook: (cookId: string | undefined) => void;
  /** Empties the log and returns it, for undo. */
  clear: () => EngineEvent[];
};

export const useHomeEvents = create<HomeEventsState>()(
  persist(
    (set, get) => ({
      events: [],
      asCookId: undefined,
      log: (type, detail = {}) =>
        set((s) => {
          const events = appendEvent(s.events, { type, at: Date.now(), viewerId: LOCAL_VIEWER, ...detail });
          return events === s.events ? s : { events };
        }),
      setAsCook: (asCookId) => set({ asCookId }),
      clear: () => {
        const was = get().events;
        set({ events: [] });
        return was;
      },
    }),
    {
      name: `${STORAGE_PREFIX}/home-events`,
      version: 1,
      storage: persistentStorage(1),
      partialize: ({ events, asCookId }) => ({ events, asCookId }),
      // A bad entry is dropped rather than failing the whole log.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<HomeEventsState>;
        const events = Array.isArray(s.events) ? s.events.filter(isEvent) : [];
        return { ...current, events, asCookId: typeof s.asCookId === 'string' ? s.asCookId : undefined };
      },
    },
  ),
);

/** Whether this cook is followed on this phone (the latest follow or unfollow tap wins). */
export function followedHere(events: readonly EngineEvent[], cookId: string): boolean | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.cookId === cookId && (e.type === 'follow' || e.type === 'unfollow')) return e.type === 'follow';
  }
  return undefined;
}
