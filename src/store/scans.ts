// When this phone last scanned, for the free allowance (D-030: 3 a month).
// Only the times are kept, never the photos. Pro isn't sold yet (P8), so
// everyone is on the free allowance until RevenueCat says otherwise.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { pruneScans, scanAllowance, type Allowance } from '@/domain/cupboard/scan';
import { persistentStorage, STORAGE_PREFIX } from './storage';

type ScansState = { usedAt: number[]; record: () => void };

export const useScans = create<ScansState>()(
  persist(
    (set) => ({
      usedAt: [],
      record: () => set((s) => ({ usedAt: [...pruneScans(s.usedAt, new Date()), Date.now()] })),
    }),
    { name: `${STORAGE_PREFIX}/scans`, version: 1, storage: persistentStorage(), partialize: ({ usedAt }) => ({ usedAt }) },
  ),
);

export function useScanAllowance(): Allowance {
  const usedAt = useScans((s) => s.usedAt);
  return scanAllowance(usedAt, new Date(), false);
}
