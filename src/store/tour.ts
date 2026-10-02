// The first-use tour (D-035): whether it's been seen, which step is showing,
// and where on screen each thing it points at lives. Screens register the
// views the tour points at with useTourTarget; the overlay measures them when
// their step comes up, so the spotlight sits on the real control.
import type { RefCallback } from 'react';
import { useCallback } from 'react';
import type { View } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistentStorage, STORAGE_PREFIX } from './storage';

export type TourTarget = 'home-pantry' | 'tab-cupboard' | 'tab-plan' | 'tab-list';

type TourState = {
  seen: boolean;
  /** The step showing, or undefined when the tour is closed. */
  step: number | undefined;
  start: () => void;
  goTo: (step: number) => void;
  finish: () => void;
};

export const useTour = create<TourState>()(
  persist(
    (set) => ({
      seen: false,
      step: undefined,
      start: () => set({ step: 0 }),
      goTo: (step) => set({ step }),
      // Skipping and finishing both count as seen: it never comes back uninvited.
      finish: () => set({ seen: true, step: undefined }),
    }),
    { name: `${STORAGE_PREFIX}/tour`, version: 1, storage: persistentStorage(), partialize: ({ seen }) => ({ seen }) },
  ),
);

// The views on screen, kept outside React state: registering one shouldn't re-render anything.
const targets = new Map<TourTarget, View>();

export function tourTarget(id: TourTarget): View | undefined {
  return targets.get(id);
}

/** Put on the view the tour should point at: `<View ref={useTourTarget('home-pantry')} collapsable={false}>`. */
export function useTourTarget(id: TourTarget): RefCallback<View> {
  return useCallback(
    (node: View | null) => {
      if (node) targets.set(id, node);
      else if (targets.get(id)) targets.delete(id);
    },
    [id],
  );
}
