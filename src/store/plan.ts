// The week plan and the cook's edits to each week's shopping list.
// The list itself is never stored: it's derived from these (map rule 3).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/lib/ids';
import {
  isPlanEntry,
  pruneCutoff,
  pruneDay,
  pruneOldEntries,
  shoppingWeek,
  toISODate,
  type ISODate,
  type PlanEntry,
  type Slot,
} from '@/domain/plan/week';
import { addExtras, EMPTY_EDITS, type WeekListEdits } from '@/domain/shopping/derive';
import { persistentStorage, savedAs } from './storage';

type PlanState = {
  entries: PlanEntry[];
  /** Keyed by the Monday that starts the week. */
  listEdits: Record<ISODate, WeekListEdits>;
  /** The latest day old weeks were pruned against: see pruneDay. */
  prunedTo: ISODate | undefined;
  addEntry: (recipeId: string, day: ISODate, slot: Slot, servings: number) => PlanEntry;
  removeEntry: (id: string) => PlanEntry | undefined;
  restoreEntry: (entry: PlanEntry) => void;
  setServings: (id: string, servings: number) => void;
  moveEntry: (id: string, day: ISODate, slot: Slot) => void;
  editList: (week: ISODate, change: (edits: WeekListEdits) => WeekListEdits) => void;
  /** Adds free-text items to the list you're shopping for. Returns an undo, or undefined if nothing was new. */
  addToList: (texts: string[]) => (() => void) | undefined;
};

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => ({
      entries: [],
      listEdits: {},
      prunedTo: undefined,
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
      addToList: (texts) => {
        const week = shoppingWeek(toISODate(new Date()));
        const { edits, added } = addExtras(get().listEdits[week] ?? EMPTY_EDITS, texts, newId, Date.now());
        if (added.length === 0) return undefined;
        set((s) => ({ listEdits: { ...s.listEdits, [week]: edits } }));
        const ids = new Set(added.map((x) => x.id));
        return () => get().editList(week, (e) => ({ ...e, extras: e.extras.filter((x) => !ids.has(x.id)) }));
      },
    }),
    {
      ...savedAs<PlanState>('plan', 1),
      storage: persistentStorage(),
      partialize: ({ entries, listEdits, prunedTo }) => ({ entries, listEdits, prunedTo }),
      // Old weeks are pruned when the app starts (D-009); the cook log keeps the history.
      // Pruning follows a high-water mark rather than the raw clock (audit F08), and
      // wrong-shaped entries are dropped rather than crashing the Plan tab (F02, F04).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const { day, seen } = pruneDay(state.prunedTo, toISODate(new Date()));
        const cutoff = pruneCutoff(day);
        usePlan.setState({
          entries: pruneOldEntries(state.entries.filter(isPlanEntry), day),
          listEdits: Object.fromEntries(Object.entries(state.listEdits).filter(([week]) => week >= cutoff)),
          prunedTo: seen,
        });
      },
    },
  ),
);
