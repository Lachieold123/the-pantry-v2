// Back to a fresh install that skips the welcome (D-043): what signing out
// and deleting the account leave on this phone. Everything here is in the
// account, so nothing is lost. Untouched on purpose: this phone's own
// settings (theme, high contrast, and the Sunday reminder, which the phone has
// scheduled and would otherwise keep sending while reading "off"); shared dishes (plates)
// and Pro, which the account doesn't keep; the tour; and the old-app import
// flag, so the old app's data isn't brought across a second time.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { EMPTY_HOUSEHOLD, useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { usePlan } from './plan';
import { usePlates } from './plates';
import { usePreferences } from './preferences';
import { useSaved } from './saved';
import { STORAGE_PREFIX } from './storage';

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

/**
 * Deleting the account goes further than signing out (SEC-12): the dishes
 * you shared on this phone (photos, titles, captions) and any backup copies
 * of saved data go too, so a handed-down phone shows nothing of yours. The
 * old app's own saved data and the photo files are left for now (K-21).
 */
export async function wipeAfterDeletion(): Promise<void> {
  usePlates.setState(usePlates.getInitialState());
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backups = keys.filter((k) => k.startsWith(`${STORAGE_PREFIX}/`) && k.includes('.corrupt.'));
    if (backups.length) await AsyncStorage.multiRemove(backups);
  } catch (e) {
    console.warn('[reset] couldn’t remove backup copies', e);
  }
}
