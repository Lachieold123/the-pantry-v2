// The account's sync (D-043): everything personal, plus the kitchen while
// you're not in a household (domain/sync scopeOf). It runs only for a
// permanent sign-in; the quiet anonymous user behind a household never has
// account rows.
//
// Moving the kitchen between scopes:
// - Joining a household, the kitchen moves to the household (with the
//   bring-along rule) and the account stops sending it. The account's old
//   kitchen rows stay where they are, untouched and unread.
// - Leaving, this phone keeps the kitchen as it is, and the account's kitchen
//   is made to match it exactly: changed records are sent, and anything the
//   account still had that this phone doesn't is marked removed. So nothing
//   on the phone is lost, and nothing stale comes back doubled.
import type { AvoidList, DietPreference } from '@/domain/recipes/diets';
import type { UnitSystem } from '@/domain/ingredients/format';
import type { TimeFilter } from '@/domain/recipes/search';
import type { CuisineId } from '@/domain/recipes/types';
import type { Shelf } from '@/domain/cupboard/cookable';
import {
  changedRows,
  KITCHEN_KINDS,
  kitchenFromRows,
  personalFromRows,
  scopeOf,
  type Personal,
  type Row,
  type SharedKitchen,
  type Snapshot,
} from '@/domain/sync/rows';
import { listenAccount, pullAccountRows, pushAccountRows, sessionReady } from '@/lib/account';
import { useAccount } from './account';
import { useCookLog } from './cookLog';
import { useCupboard } from './cupboard';
import { useHousehold } from './household';
import { useMyRecipes, type MyRecipe } from './myRecipes';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useSaved } from './saved';
import { createEngine } from './sync';

/** Whether the kitchen syncs with the account right now, by the one rule in domain/sync. */
const kitchenInAccount = () => scopeOf('plan', useHousehold.getState().household !== undefined) === 'account';

export function localPersonal(): Personal {
  const saved = useSaved.getState();
  const p = usePreferences.getState();
  const cupboard = useCupboard.getState();
  return {
    bookmarks: saved.bookmarks,
    collections: saved.collections,
    hidden: saved.hidden,
    myRecipes: useMyRecipes.getState().recipes,
    recent: saved.recentlyViewed,
    cookLog: useCookLog.getState().log,
    prefs: {
      diet: p.diet,
      avoid: p.avoid,
      cuisines: p.cuisines,
      weeknight: p.weeknight ?? null,
      units: p.units,
      shelf: cupboard.shelf,
      moveTicked: cupboard.moveTickedToCupboard,
    },
  };
}

/** The kitchen as the account keeps it: no `recipe` copies, because every recipe of yours is already a `myrecipe` row. */
function localKitchen(): SharedKitchen {
  const { entries, listEdits } = usePlan.getState();
  return { entries, listEdits, cupboard: useCupboard.getState().items, recipes: {} };
}

/** What the account holds from this phone right now. */
export function accountSnapshot(): Snapshot {
  return kitchenInAccount() ? { ...localPersonal(), ...localKitchen() } : localPersonal();
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isMyRecipe = (v: unknown): v is MyRecipe => isObj(v) && typeof v.id === 'string' && isObj(v.draft);

/** Settings from rows, each only if it looks right: a row from a newer app version mustn't break this one. */
function applyPrefs(prefs: Personal['prefs']): void {
  const next: Partial<ReturnType<typeof usePreferences.getState>> = {};
  if (typeof prefs.diet === 'string') next.diet = prefs.diet as DietPreference;
  if (isObj(prefs.avoid) && Array.isArray(prefs.avoid.options) && Array.isArray(prefs.avoid.custom)) next.avoid = prefs.avoid as AvoidList;
  if (Array.isArray(prefs.cuisines)) next.cuisines = prefs.cuisines as CuisineId[];
  if ('weeknight' in prefs) next.weeknight = typeof prefs.weeknight === 'string' ? (prefs.weeknight as TimeFilter) : undefined;
  if (prefs.units === 'metric' || prefs.units === 'imperial') next.units = prefs.units as UnitSystem;
  usePreferences.setState(next);
  const cupboard: Partial<ReturnType<typeof useCupboard.getState>> = {};
  if (isObj(prefs.shelf) && typeof prefs.shelf.mode === 'string') cupboard.shelf = prefs.shelf as Shelf;
  if (typeof prefs.moveTicked === 'boolean') cupboard.moveTickedToCupboard = prefs.moveTicked;
  useCupboard.setState(cupboard);
}

/** Rebuilds this phone's stores from the account's rows. */
function applyAccount(rows: Row[]): void {
  const p = personalFromRows(rows);
  useSaved.setState({
    bookmarks: [...p.bookmarks],
    collections: p.collections.map((c) => ({ ...c, recipeIds: [...c.recipeIds] })),
    hidden: [...p.hidden],
    recentlyViewed: [...p.recent],
  });
  useMyRecipes.setState({
    recipes: Object.fromEntries(Object.entries(p.myRecipes).filter(([, r]) => isMyRecipe(r))) as Record<string, MyRecipe>,
  });
  useCookLog.setState({ log: [...p.cookLog] });
  applyPrefs(p.prefs);
  if (kitchenInAccount()) {
    const k = kitchenFromRows(rows);
    usePlan.setState({ entries: [...k.entries], listEdits: { ...k.listEdits } });
    useCupboard.setState({ items: [...k.cupboard] });
  }
}

const KITCHEN = new Set<string>(KITCHEN_KINDS);

/** Leaving a household: the account's kitchen becomes exactly this phone's. Joining: nothing to send. */
function reshape(_from: string, to: string): Row[] {
  if (to !== 'with-kitchen') return [];
  const theirs = kitchenFromRows(Object.values(useAccount.getState().mirror).filter((r) => KITCHEN.has(r.kind)));
  return changedRows({ ...theirs, recipes: {} }, localKitchen(), Date.now(), useAccount.getState().device);
}

const userId = () => useAccount.getState().who?.id;
const fail = { ok: false } as const;

export const accountEngine = createEngine({
  read: () => {
    const s = useAccount.getState();
    return { mirror: s.mirror, pending: s.pending, status: s.sync, lastSyncedAt: s.lastSyncedAt };
  },
  write: ({ status, ...rest }) => useAccount.setState({ ...rest, ...(status ? { sync: status } : {}) }),
  active: () => useAccount.getState().who !== undefined && !useAccount.getState().needsMerge,
  local: accountSnapshot,
  shape: () => (kitchenInAccount() ? 'with-kitchen' : 'personal'),
  reshape,
  apply: applyAccount,
  watch: (onChange) => [
    usePlan.subscribe(onChange),
    useCupboard.subscribe(onChange),
    useSaved.subscribe(onChange),
    useMyRecipes.subscribe(onChange),
    useCookLog.subscribe(onChange),
    usePreferences.subscribe(onChange),
    // Joining or leaving a household moves the kitchen in or out of the account.
    useHousehold.subscribe((s, prev) => {
      if ((s.household === undefined) !== (prev.household === undefined)) onChange();
    }),
  ],
  author: () => useAccount.getState().device,
  // The saved sign-in loads first, so the live connection carries it and row security lets the rows through.
  ready: sessionReady,
  pull: async () => {
    const id = userId();
    return id ? pullAccountRows(id) : fail;
  },
  push: async (rows) => {
    const id = userId();
    return id ? pushAccountRows(id, useAccount.getState().device, rows) : fail;
  },
  listen: (onRow) => {
    const id = userId();
    return id ? listenAccount(id, onRow) : () => undefined;
  },
});
