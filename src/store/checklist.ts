// The first-run checklist on Home: whether it's been started (by finishing or
// skipping the welcome) and whether the cook has put it away. What's done is
// never stored; it's worked out from the other stores (domain/welcome/checklist).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { checklistProgress, checklistSteps, type ChecklistStep } from '@/domain/welcome/checklist';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useHousehold } from './household';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useSaved } from './saved';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type ChecklistState = {
  /** Only people who come through the new welcome see it, not testers updating mid-way. */
  started: boolean;
  dismissed: boolean;
  start: () => void;
  dismiss: () => void;
};

export const useChecklist = create<ChecklistState>()(
  persist(
    (set) => ({
      started: false,
      dismissed: false,
      // A redo of the welcome doesn't bring back a checklist that was put away.
      start: () => set((s) => (s.started ? s : { started: true })),
      dismiss: () => set({ dismissed: true }),
    }),
    {
      name: `${STORAGE_PREFIX}/checklist`,
      version: 1,
      storage: persistentStorage(),
      partialize: ({ started, dismissed }) => ({ started, dismissed }),
    },
  ),
);

export type FirstRunChecklist = { steps: ChecklistStep[]; done: number; total: number; visible: boolean };

/** The checklist as Home shows it: hidden until started, once put away, and once every step is done. */
export function useFirstRunChecklist(): FirstRunChecklist {
  const started = useChecklist((s) => s.started);
  const dismissed = useChecklist((s) => s.dismissed);
  const intents = usePreferences((s) => s.intents);
  const cupboard = useCupboard((s) => s.items.length);
  const planned = usePlan((s) => s.entries.length);
  const saved = useSaved((s) => s.bookmarks.length);
  const cooked = useCookLog((s) => s.log.length);
  const inHousehold = useHousehold((s) => s.household !== undefined);
  const steps = checklistSteps(intents, { cupboard, planned, saved, cooked, inHousehold });
  const { done, total, complete } = checklistProgress(steps);
  return { steps, done, total, visible: started && !dismissed && !complete };
}
