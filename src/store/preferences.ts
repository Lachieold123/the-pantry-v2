// How the cook wants the app to look and measure. One slice, one storage key,
// versioned so later changes can migrate old saved values.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UnitSystem } from '@/domain/ingredients/format';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

type PreferencesState = {
  appearance: Appearance;
  highContrast: boolean;
  units: UnitSystem;
  setAppearance: (appearance: Appearance) => void;
  setHighContrast: (on: boolean) => void;
  setUnits: (units: UnitSystem) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      appearance: 'system',
      highContrast: false,
      units: 'metric',
      setAppearance: (appearance) => set({ appearance }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setUnits: (units) => set({ units }),
    }),
    {
      name: `${STORAGE_PREFIX}/preferences`,
      version: 1,
      storage: persistentStorage,
      partialize: ({ appearance, highContrast, units }) => ({ appearance, highContrast, units }),
    },
  ),
);

/** Resolves once saved preferences are loaded, so the first frame uses the right theme. */
export function preferencesHydrated(): Promise<void> {
  if (usePreferences.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = usePreferences.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
