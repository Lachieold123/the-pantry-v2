// Back to a fresh install that skips the welcome (D-043): what signing out
// and deleting the account leave on this phone. Everything here is in the
// account, so nothing is lost. Untouched on purpose: this phone's own
// settings (theme, high contrast, and the Sunday reminder, which the phone has
// scheduled and would otherwise keep sending while reading "off"); shared dishes (plates)
// and Pro, which the account doesn't keep; the tour; and the old-app import
// flag, so the old app's data isn't brought across a second time.
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { EMPTY_HOUSEHOLD, useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useSaved } from './saved';

export function resetThisPhone(): void {
  usePlan.setState(usePlan.getInitialState());
  useCupboard.setState(useCupboard.getInitialState());
  useSaved.setState(useSaved.getInitialState());
  useMyRecipes.setState(useMyRecipes.getInitialState());
  useCookLog.setState(useCookLog.getInitialState());
  const { appearance, highContrast, sundayReminder } = usePreferences.getState();
  usePreferences.setState({ ...usePreferences.getInitialState(), appearance, highContrast, sundayReminder, onboarded: true });
  useHousehold.setState({ ...EMPTY_HOUSEHOLD, userId: undefined, lastSyncedAt: undefined, rejoin: undefined });
}
