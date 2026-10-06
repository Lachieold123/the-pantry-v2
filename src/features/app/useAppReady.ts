// True once everything the first frame needs is loaded: the brand fonts,
// saved preferences (so the theme is right from the first pixel) and, on the
// very first launch, anything brought across from the old app (so onboarding
// knows whether it's needed).
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { useCookLog } from '@/store/cookLog';
import { useCupboard } from '@/store/cupboard';
import { useMyRecipes } from '@/store/myRecipes';
import { importFromOldAppOnce, useWelcomeBack } from '@/store/oldAppImport';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { startSync, useHousehold } from '@/store/household';
import { refreshEntitlement, usePro } from '@/store/pro';
import { useSaved } from '@/store/saved';
import { allHydrated } from '@/store/storage';
import { FONT_FILES } from '@/ui/theme/fonts';

async function prepare(): Promise<void> {
  // Every store, so nothing on the first screen jumps in late (audit PERF-7). The wait has
  // a limit, so a store that never loads can't hold the splash screen up forever (ARCH-6).
  const loaded = await allHydrated([
    usePreferences,
    usePlan,
    useSaved,
    useCookLog,
    useCupboard,
    useMyRecipes,
    useWelcomeBack,
    usePro,
    useHousehold,
  ]);
  if (loaded === 'timed-out') console.warn('[startup] saved data took too long to load; opening anyway');
  // Ask the store who is Pro; the saved mirror covers an offline start. Never blocks opening.
  void refreshEntitlement();
  // A household's sync starts once the kitchen has loaded; it never holds up opening (D-039).
  startSync();
  try {
    await importFromOldAppOnce();
  } catch (e) {
    // A failed import must never stop the app opening.
    console.warn('[startup] old-app import failed', e);
  }
}

export function useAppReady(): boolean {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [dataReady, setDataReady] = useState(false);
  useEffect(() => {
    void prepare().then(() => setDataReady(true));
  }, []);
  // A font that fails to load falls back to the system face rather than blocking the app.
  return (fontsLoaded || fontError !== null) && dataReady;
}
