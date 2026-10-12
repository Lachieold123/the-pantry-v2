// A recipe read from a link, waiting in the editor for the cook to check and
// save. Kept in memory only: if they cancel, nothing was saved. It lives with
// the stores because two places start an import (My recipes' link row and the
// import sheet) and the editor finishes it.
import { create } from 'zustand';

import type { RecipeDraft } from '@/domain/recipes/draft';
import { usePro } from './pro';

type Pending = { draft: RecipeDraft; url: string };

export const usePendingImport = create<{ pending?: Pending | undefined; set: (p: Pending | undefined) => void }>()((set) => ({
  set: (pending) => set({ pending }),
}));

/** Hands a recipe found on a page to the editor. Only an import that found a recipe counts towards the free 5 a month (D-038). */
export function beginImportReview(draft: RecipeDraft, url: string): void {
  usePro.getState().recordImport();
  usePendingImport.getState().set({ draft, url });
}
