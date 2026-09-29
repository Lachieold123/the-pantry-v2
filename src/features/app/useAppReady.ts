// True once everything the first frame needs is loaded: the brand fonts,
// saved preferences (so the theme is right from the first pixel) and, on the
// very first launch, anything brought across from the old app (so onboarding
// knows whether it's needed).
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { importFromOldAppOnce } from '@/store/oldAppImport';
import { preferencesHydrated } from '@/store/preferences';
import { FONT_FILES } from '@/ui/theme/fonts';

async function prepare(): Promise<void> {
  await preferencesHydrated();
  try {
    await importFromOldAppOnce();
  } catch {
    // A failed import must never stop the app opening.
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
