// How the cook wants the app to look and measure. One slice, one storage key,
// versioned so later changes can migrate old saved values.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UnitSystem } from '@/domain/ingredients/format';
import type { AvoidList, AvoidOption, DietPreference } from '@/domain/recipes/diets';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

type PreferencesState = {
  appearance: Appearance;
  highContrast: boolean;
  units: UnitSystem;
  diet: DietPreference;
  avoid: AvoidList;
  setAppearance: (appearance: Appearance) => void;
  setDiet: (diet: DietPreference) => void;
  toggleAvoidOption: (option: AvoidOption) => void;
  addAvoidWord: (word: string) => void;
  removeAvoidWord: (word: string) => void;
  setHighContrast: (on: boolean) => void;
  setUnits: (units: UnitSystem) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      appearance: 'system',
      highContrast: false,
      units: 'metric',
      diet: 'everything',
      avoid: { options: [], custom: [] },
      setAppearance: (appearance) => set({ appearance }),
      setDiet: (diet) => set({ diet }),
      toggleAvoidOption: (option) =>
        set((s) => ({
          avoid: {
            ...s.avoid,
            options: s.avoid.options.includes(option) ? s.avoid.options.filter((o) => o !== option) : [...s.avoid.options, option],
          },
        })),
      addAvoidWord: (word) =>
        set((s) => {
          const w = word.trim().toLowerCase();
          return !w || s.avoid.custom.includes(w) ? s : { avoid: { ...s.avoid, custom: [...s.avoid.custom, w] } };
        }),
      removeAvoidWord: (word) => set((s) => ({ avoid: { ...s.avoid, custom: s.avoid.custom.filter((c) => c !== word) } })),
      setHighContrast: (highContrast) => set({ highContrast }),
      setUnits: (units) => set({ units }),
    }),
    {
      name: `${STORAGE_PREFIX}/preferences`,
      version: 2,
      storage: persistentStorage,
      partialize: ({ appearance, highContrast, units, diet, avoid }) => ({ appearance, highContrast, units, diet, avoid }),
      // Version 1 had no diet or avoid list; they start empty.
      migrate: (saved) => ({ diet: 'everything', avoid: { options: [], custom: [] }, ...(saved as object) }) as unknown as PreferencesState,
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
