// Back to a fresh install that skips the welcome (D-043): what signing out
// and deleting the account leave on this phone. Everything signing out clears
// is in the account, so nothing is lost. Untouched on purpose: this phone's own
// settings (theme, high contrast, and the Sunday reminder, which the phone has
// scheduled and would otherwise keep sending while reading "off"); and the
// old-app import flag, so the old app's data isn't brought across a second time.
// The account store itself is cleared by accountActions.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useChecklist } from './checklist';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useHomeEvents } from './homeEvents';
import { EMPTY_HOUSEHOLD, useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { useWelcomeBack } from './oldAppImport';
import { usePlan } from './plan';
import { usePlates } from './plates';
import { usePreferences } from './preferences';
import { usePro } from './pro';
import { useSaved } from './saved';
import { useScans } from './scans';
import { STORAGE_PREFIX } from './storage';
import { useTour } from './tour';

/** Cleared by a sign-out: all of it is in the account. */
export const CLEARED_ON_SIGN_OUT = [usePlan, useCupboard, useSaved, useMyRecipes, useCookLog, usePreferences, useHousehold];

/**
 * Cleared only when the account is deleted, because the account doesn't keep
 * them, so a sign-out would lose them: the dishes you shared on this phone, the
 * Home log (opens, reading time, hides, the cooks you follow), the first-run
 * checklist and the old-app welcome message (SEC-12, DATA-11).
 */
export const CLEARED_ON_DELETE = [usePlates, useHomeEvents, useChecklist, useWelcomeBack];

/** Kept even after deletion, as they're about the phone, not the person: Pro (Apple's purchase), the free-scan count, the tour. */
export const KEPT = [usePro, useScans, useTour];

export function resetThisPhone(): void {
  usePlan.setState(usePlan.getInitialState());
  useCupboard.setState(useCupboard.getInitialState());
  useSaved.setState(useSaved.getInitialState());
  useMyRecipes.setState(useMyRecipes.getInitialState());
  useCookLog.setState(useCookLog.getInitialState());
  // Agreeing to the terms belongs to whoever uses this phone, so it outlives a reset too.
  const { appearance, highContrast, sundayReminder, termsAcceptedAt } = usePreferences.getState();
  usePreferences.setState({
    ...usePreferences.getInitialState(),
    appearance,
    highContrast,
    sundayReminder,
    termsAcceptedAt,
    onboarded: true,
  });
  useHousehold.setState({ ...EMPTY_HOUSEHOLD, userId: undefined, lastSyncedAt: undefined, rejoin: undefined, unsent: undefined });
}

/**
 * Deleting the account goes further than signing out (SEC-12): the stores
 * above, and any backup copies of saved data, so a handed-down phone shows
 * nothing of yours. The old app's own saved data and the photo files are left for now (K-21).
 */
export async function wipeAfterDeletion(): Promise<void> {
  usePlates.setState(usePlates.getInitialState());
  useHomeEvents.setState(useHomeEvents.getInitialState());
  useChecklist.setState(useChecklist.getInitialState());
  useWelcomeBack.setState(useWelcomeBack.getInitialState());
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backups = keys.filter((k) => k.startsWith(`${STORAGE_PREFIX}/`) && k.includes('.corrupt.'));
    if (backups.length) await AsyncStorage.multiRemove(backups);
  } catch (e) {
    console.warn('[reset] couldn’t remove backup copies', e);
  }
}
