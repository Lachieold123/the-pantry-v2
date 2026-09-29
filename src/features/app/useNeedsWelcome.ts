// Whether this is a first launch that should see the welcome and taste quiz.
import { usePreferences } from '@/store/preferences';

export function useNeedsWelcome(): boolean {
  return !usePreferences((s) => s.onboarded);
}
