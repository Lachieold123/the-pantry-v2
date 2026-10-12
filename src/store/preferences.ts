// How the cook wants the app to look and measure. One slice, one storage key,
// versioned so later changes can migrate old saved values.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UnitSystem } from '@/domain/ingredients/format';
import type { AvoidList, AvoidOption, DietPreference } from '@/domain/recipes/diets';
import type { TimeFilter } from '@/domain/recipes/search';
import type { CuisineId } from '@/domain/recipes/types';
import { toggleIntent, type Intent, type Skill } from '@/domain/welcome/onboarding';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

type PreferencesState = {
  appearance: Appearance;
  highContrast: boolean;
  units: UnitSystem;
  diet: DietPreference;
  avoid: AvoidList;
  /** Cuisines picked in Settings (the old welcome asked too): they lift suggestions, never filter them out. */
  cuisines: CuisineId[];
  /** How long a weeknight dinner can take. Undefined means no rush. */
  weeknight: TimeFilter | undefined;
  sundayReminder: boolean;
  /** "What brings you here?" from the welcome: orders the first-run checklist. */
  intents: Intent[];
  /** How sure a cook they are: lifts recipes that suit, never hides any. */
  skill: Skill | undefined;
  /** When the cook agreed to the published terms on the welcome, if they have. */
  termsAcceptedAt: number | undefined;
  /** False until the welcome is finished or skipped. */
  onboarded: boolean;
  setAppearance: (appearance: Appearance) => void;
  setDiet: (diet: DietPreference) => void;
  toggleAvoidOption: (option: AvoidOption) => void;
  addAvoidWord: (word: string) => void;
  removeAvoidWord: (word: string) => void;
  setHighContrast: (on: boolean) => void;
  setUnits: (units: UnitSystem) => void;
  toggleCuisine: (cuisine: CuisineId) => void;
  setWeeknight: (weeknight: TimeFilter | undefined) => void;
  setSundayReminder: (on: boolean) => void;
  setOnboarded: (done: boolean) => void;
  toggleIntent: (intent: Intent) => void;
  setSkill: (skill: Skill | undefined) => void;
  acceptTerms: (at: number) => void;
  /** Replaces the taste answers wholesale, e.g. from the old app's onboarding. */
  applyTaste: (taste: Pick<PreferencesState, 'diet' | 'avoid' | 'cuisines' | 'weeknight' | 'units'>) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      appearance: 'system',
      highContrast: false,
      units: 'metric',
      diet: 'everything',
      avoid: { options: [], custom: [] },
      cuisines: [],
      weeknight: undefined,
      sundayReminder: false,
      intents: [],
      skill: undefined,
      termsAcceptedAt: undefined,
      onboarded: false,
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
      toggleCuisine: (cuisine) =>
        set((s) => ({ cuisines: s.cuisines.includes(cuisine) ? s.cuisines.filter((c) => c !== cuisine) : [...s.cuisines, cuisine] })),
      setWeeknight: (weeknight) => set({ weeknight }),
      setSundayReminder: (sundayReminder) => set({ sundayReminder }),
      setOnboarded: (onboarded) => set({ onboarded }),
      toggleIntent: (intent) => set((s) => ({ intents: toggleIntent(s.intents, intent) })),
      setSkill: (skill) => set({ skill }),
      acceptTerms: (termsAcceptedAt) => set({ termsAcceptedAt }),
      applyTaste: (taste) => set(taste),
    }),
    {
      name: `${STORAGE_PREFIX}/preferences`,
      version: 4,
      storage: persistentStorage(),
      partialize: (s) => ({
        appearance: s.appearance,
        highContrast: s.highContrast,
        units: s.units,
        diet: s.diet,
        avoid: s.avoid,
        cuisines: s.cuisines,
        weeknight: s.weeknight,
        sundayReminder: s.sundayReminder,
        intents: s.intents,
        skill: s.skill,
        termsAcceptedAt: s.termsAcceptedAt,
        onboarded: s.onboarded,
      }),
      // Each version only added fields, so older saves just gain the defaults.
      migrate: (saved) =>
        ({
          diet: 'everything',
          avoid: { options: [], custom: [] },
          cuisines: [],
          weeknight: undefined,
          sundayReminder: false,
          intents: [],
          skill: undefined,
          termsAcceptedAt: undefined,
          onboarded: false,
          ...(saved as object),
        }) as unknown as PreferencesState,
    },
  ),
);
