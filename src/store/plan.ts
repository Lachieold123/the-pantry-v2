// The week plan and the cook's edits to each week's shopping list.
// The list itself is never stored: it's derived from these (map rule 3).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/lib/ids';
import { pruneCutoff, pruneOldEntries, toISODate, type ISODate, type PlanEntry, type Slot } from '@/domain/plan/week';
import { EMPTY_EDITS, type WeekListEdits } from '@/domain/shopping/derive';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type PlanState = {
  entries: PlanEntry[];
  /** Keyed by the Monday that starts the week. */
  listEdits: Record<ISODate, WeekListEdits>;
  addEntry: (recipeId: string, day: ISODate, slot: Slot, servings: number) => PlanEntry;
  removeEntry: (id: string) => PlanEntry | undefined;
  restoreEntry: (entry: PlanEntry) => void;
  setServings: (id: string, servings: number) => void;
  moveEntry: (id: string, day: ISODate, slot: Slot) => void;
  editList: (week: ISODate, change: (edits: WeekListEdits) => WeekListEdits) => void;
};

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => ({
      entries: [],
      listEdits: {},
      addEntry: (recipeId, day, slot, servings) => {
        const entry: PlanEntry = { id: newId(), recipeId, day, slot, servings };
        set((s) => ({ entries: [...s.entries, entry] }));
        return entry;
      },
      removeEntry: (id) => {
        const entry = get().entries.find((e) => e.id === id);
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        return entry;
      },
      restoreEntry: (entry) => set((s) => (s.entries.some((e) => e.id === entry.id) ? s : { entries: [...s.entries, entry] })),
      setServings: (id, servings) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, servings } : e)) })),
      moveEntry: (id, day, slot) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, day, slot } : e)) })),
      editList: (week, change) => set((s) => ({ listEdits: { ...s.listEdits, [week]: change(s.listEdits[week] ?? EMPTY_EDITS) } })),
    }),
    {
      name: `${STORAGE_PREFIX}/plan`,
      version: 1,
      storage: persistentStorage,
      partialize: ({ entries, listEdits }) => ({ entries, listEdits }),
      // Old weeks are pruned when the app starts (D-009); the cook log keeps the history.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const today = toISODate(new Date());
        const cutoff = pruneCutoff(today);
        usePlan.setState({
          entries: pruneOldEntries(state.entries, today),
          listEdits: Object.fromEntries(Object.entries(state.listEdits).filter(([week]) => week >= cutoff)),
        });
      },
    },
  ),
);
