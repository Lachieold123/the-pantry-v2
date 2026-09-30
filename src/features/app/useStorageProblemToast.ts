// Tells the cook when their changes aren't being kept, instead of letting the
// app look saved and then lose things after a restart (audit F05, F220).
import { useEffect } from 'react';

import { onStorageProblem, type StorageProblem } from '@/store/storage';
import { useToast } from '@/ui/patterns/Toast';

export const STORAGE_PROBLEM_MESSAGES: Record<StorageProblem['kind'], string> = {
  'save-failed': "Couldn't save your changes. Your phone's storage may be full.",
  'read-only': "Some saved data couldn't be loaded, so changes to it won't be kept for now.",
};

const QUIET_MS = 10_000;

export function useStorageProblemToast(): void {
  const toast = useToast();
  useEffect(() => {
    const shownAt: Partial<Record<StorageProblem['kind'], number>> = {};
    // Several stores failing at once is still one problem to the cook: one toast, not a burst.
    return onStorageProblem((problem) => {
      const now = Date.now();
      if (now - (shownAt[problem.kind] ?? -Infinity) < QUIET_MS) return;
      shownAt[problem.kind] = now;
      toast({ message: STORAGE_PROBLEM_MESSAGES[problem.kind] });
    });
  }, [toast]);
}
