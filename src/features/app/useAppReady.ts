// True once everything the first frame needs is loaded: the brand fonts,
// saved preferences (so the theme is right from the first pixel) and, on the
// very first launch, anything brought across from the old app (so onboarding
// knows whether it's needed).
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { useAccount } from '@/store/account';
import { startAccount } from '@/store/accountActions';
import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { useMyRecipes } from '@/store/myRecipes';
import { importFromOldAppOnce, useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { recoverHousehold, startSync, useHousehold } from '@/store/household';
import { refreshEntitlement, usePro } from '@/store/pro';
import { useSaved } from '@/store/saved';
import { allHydrated, hydrated } from '@/store/storage';
import { FONT_FILES } from '@/ui/theme/fonts';

const STORES = [usePreferences, usePlan, useSaved, useCookLog, useCupboard, useMyRecipes, useWelcomeBack, usePro, useHousehold, useAccount];

async function prepare(): Promise<void> {
  // Every store, so nothing on the first screen jumps in late (audit PERF-7). The wait has
  // a limit, so a store that never loads can't hold the splash screen up forever (ARCH-6).
  const loaded = await allHydrated(STORES);
  if (loaded === 'timed-out') console.warn('[startup] saved data took too long to load; opening anyway');
  // Ask the store who is Pro; the saved mirror covers an offline start. Never blocks opening.
  void refreshEntitlement();
  try {
    await importFromOldAppOnce();
  } catch (e) {
    // A failed import must never stop the app opening.
    console.warn('[startup] old-app import failed', e);
  }
  // Syncing waits for every store, however long that takes: a store that loaded late would
  // otherwise be read as fresh changes and undo deletions everywhere. It never holds up opening.
  // The account starts after the import, so recipes brought across from the old app don't count
  // as a moment for its once-only offers (D-043).
  void Promise.all(STORES.map(hydrated))
    .then(async () => {
      startSync();
      startAccount();
      await recoverHousehold();
    })
    .catch((e: unknown) => console.warn('[startup] sync failed to start', e));
}

export function useAppReady(): boolean {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [dataReady, setDataReady] = useState(false);
  useEffect(() => {
    // Whatever happens, the app opens: a throw in start-up must not leave the splash screen up.
    void prepare()
      .catch((e: unknown) => console.warn('[startup] failed', e))
      .finally(() => setDataReady(true));
  }, []);
  // A font that fails to load falls back to the system face rather than blocking the app.
  return (fontsLoaded || fontError !== null) && dataReady;
}
