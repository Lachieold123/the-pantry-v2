// Your plates (D-033): photos of what you cooked, newest first, plus the one
// you're halfway through writing. Kept on this phone until accounts arrive.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { EMPTY_PLATE, makePlate, type Plate, type PlateDraft } from '@/domain/plates/plate';
import { newId } from '@/lib/ids';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type PlatesState = {
  plates: Plate[];
  draft: PlateDraft;
  setDraft: (change: (d: PlateDraft) => PlateDraft) => void;
  discardDraft: () => void;
  /** Turns the draft into a plate and starts a fresh draft. */
  share: () => Plate;
  remove: (id: string) => Plate | undefined;
  restore: (plate: Plate) => void;
};

export const usePlates = create<PlatesState>()(
  persist(
    (set, get) => ({
      plates: [],
      draft: EMPTY_PLATE,
      setDraft: (change) => set((s) => ({ draft: change(s.draft) })),
      discardDraft: () => set({ draft: EMPTY_PLATE }),
      share: () => {
        const plate = makePlate(get().draft, newId(), Date.now());
        set((s) => ({ plates: [plate, ...s.plates], draft: EMPTY_PLATE }));
        return plate;
      },
      remove: (id) => {
        const plate = get().plates.find((p) => p.id === id);
        set((s) => ({ plates: s.plates.filter((p) => p.id !== id) }));
        return plate;
      },
      restore: (plate) =>
        set((s) => ({ plates: [plate, ...s.plates.filter((p) => p.id !== plate.id)].sort((a, b) => b.createdAt - a.createdAt) })),
    }),
    {
      name: `${STORAGE_PREFIX}/plates`,
      version: 1,
      storage: persistentStorage(),
      partialize: ({ plates, draft }) => ({ plates, draft }),
    },
  ),
);
