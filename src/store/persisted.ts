// Every store saved on this phone, in one list. Startup waits for all of them
// (REPO-11), and reset.test checks that signing out and deleting the account
// say what happens to each one (DATA-11), so a new store can't be forgotten.
import { useAccount } from './account';
import { useChecklist } from './checklist';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useHomeEvents } from './homeEvents';
import { useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { useWelcomeBack } from './oldAppImport';
import { usePlan } from './plan';
import { usePlates } from './plates';
import { usePreferences } from './preferences';
import { usePro } from './pro';
import { useSaved } from './saved';
import { useScans } from './scans';
import { useTour } from './tour';

export const PERSISTED_STORES = [
  usePreferences,
  usePlan,
  useSaved,
  useCookLog,
  useCupboard,
  useMyRecipes,
  useWelcomeBack,
  usePro,
  useHousehold,
  useAccount,
  useChecklist,
  usePlates,
  useTour,
  useScans,
  useHomeEvents,
];
