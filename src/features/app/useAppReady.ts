// True once everything the first frame needs is loaded: the brand fonts and
// saved preferences (so the theme is right from the first pixel).
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { preferencesHydrated } from '@/store/preferences';
import { FONT_FILES } from '@/ui/theme/fonts';

export function useAppReady(): boolean {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [prefsReady, setPrefsReady] = useState(false);
  useEffect(() => {
    void preferencesHydrated().then(() => setPrefsReady(true));
  }, []);
  // A font that fails to load falls back to the system face rather than blocking the app.
  return (fontsLoaded || fontError !== null) && prefsReady;
}
