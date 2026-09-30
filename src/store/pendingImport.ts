// A recipe read from a link, waiting in the editor for the cook to check and
// save. Kept in memory only: if they cancel, nothing was saved.
import { create } from 'zustand';

import type { RecipeDraft } from '@/domain/recipes/draft';

type Pending = { draft: RecipeDraft; url: string };

export const usePendingImport = create<{ pending?: Pending | undefined; set: (p: Pending | undefined) => void }>()((set) => ({
  set: (pending) => set({ pending }),
}));
