// Whether this is a first launch that should see the welcome.
import { usePreferences } from '@/store/preferences';

export function useNeedsWelcome(): boolean {
  return !usePreferences((s) => s.onboarded);
}
