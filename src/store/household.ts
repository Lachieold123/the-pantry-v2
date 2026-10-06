// Your household (D-039): who you share a kitchen with, and the sync that
// keeps everyone's plan, list and cupboard the same.
//
// The plan, list and cupboard stores stay the app's truth on this phone; this
// store keeps a mirror of the household's rows beside them, and the shared
// sync engine (./sync) moves them. Offline, everything still works and
// catches up later.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kitchenFromRows, plannedOwnRecipes, type Row, type SharedKitchen } from '@/domain/sync/rows';
import { listen, myHousehold, pullRows, pushRows, signedInUser, type Household, type Result } from '@/lib/household';
import { useCupboard } from './cupboard';
import { useMyRecipes, type MyRecipe } from './myRecipes';
import { usePlan } from './plan';
import { persistentStorage, STORAGE_PREFIX } from './storage';
import { createEngine, type ScopeState, type SyncStatus } from './sync';

export type { SyncStatus };

type HouseholdState = ScopeState & {
  household: Household | undefined;
  userId: string | undefined;
  /** Other members' own recipes that the shared plan uses, so this phone can show them. */
  sharedRecipes: Record<string, MyRecipe>;
  /**
   * The household this phone was in before signing in to an account that
   * isn't a member of it (D-043, a rare case): the Household page asks you to rejoin.
   */
  rejoin: string | undefined;
};

export const EMPTY_HOUSEHOLD = {
  household: undefined,
  mirror: {},
  pending: {},
  sharedRecipes: {},
  status: 'idle',
} as const satisfies Partial<HouseholdState>;

export const useHousehold = create<HouseholdState>()(
  persist((): HouseholdState => ({ ...EMPTY_HOUSEHOLD, userId: undefined, lastSyncedAt: undefined, rejoin: undefined }), {
    name: `${STORAGE_PREFIX}/household`,
    version: 1,
    storage: persistentStorage(),
    partialize: ({ household, userId, mirror, pending, sharedRecipes, lastSyncedAt, rejoin }) => ({
      household,
      userId,
      mirror,
      pending,
      sharedRecipes,
      lastSyncedAt,
      rejoin,
    }),
  }),
);

// — The kitchen on this phone, as the household shares it.

/** @internal Shared with householdActions. */
export function localKitchen(): SharedKitchen {
  const { entries, listEdits } = usePlan.getState();
  const own = useMyRecipes.getState().recipes;
  const shared = useHousehold.getState().sharedRecipes;
  return { entries, listEdits, cupboard: useCupboard.getState().items, recipes: plannedOwnRecipes(entries, { ...shared, ...own }) };
}

const isMyRecipe = (v: unknown): v is MyRecipe =>
  typeof v === 'object' && v !== null && typeof (v as MyRecipe).id === 'string' && typeof (v as MyRecipe).draft === 'object';

/** Rebuilds the plan, list and cupboard from the household's rows. */
function applyKitchen(rows: Row[]): void {
  const kitchen = kitchenFromRows(rows);
  const own = useMyRecipes.getState().recipes;
  const sharedRecipes = Object.fromEntries(Object.entries(kitchen.recipes).filter(([id, r]) => !own[id] && isMyRecipe(r))) as Record<
    string,
    MyRecipe
  >;
  useHousehold.setState({ sharedRecipes });
  usePlan.setState({ entries: [...kitchen.entries], listEdits: { ...kitchen.listEdits } });
  useCupboard.setState({ items: [...kitchen.cupboard] });
}

const householdId = () => useHousehold.getState().household?.id ?? '';
const fail = { ok: false } as const;

const engine = createEngine({
  read: () => useHousehold.getState(),
  write: (patch) => useHousehold.setState(patch),
  active: () => useHousehold.getState().household !== undefined,
  local: localKitchen,
  apply: applyKitchen,
  watch: (onChange) => [usePlan.subscribe(onChange), useCupboard.subscribe(onChange), useMyRecipes.subscribe(onChange)],
  author: () => useHousehold.getState().userId,
  pull: async () => (householdId() ? pullRows(householdId()) : fail),
  push: async (rows) => {
    const { userId } = useHousehold.getState();
    return householdId() && userId ? pushRows(householdId(), userId, rows) : fail;
  },
  listen: (onRow) => listen(householdId(), onRow, () => void refreshMembers()),
  // The saved sign-in loads first, so the live connection carries it and row security lets the rows through.
  ready: async () => {
    await signIn();
    return true;
  },
  refresh: () => void refreshMembers(),
});

/** @internal Shared with householdActions and the account. */
export const applyMirror = engine.applyMirror;
/** @internal Shared with householdActions and the account. */
export const record = engine.record;
/** @internal Shared with householdActions. */
export const resetLastKitchen = engine.rebase;
/** Rows of this phone's household changes still waiting to be sent. */
export const householdWaiting = engine.waiting;
/** Tries to send them now. */
export const householdFlush = engine.flush;

async function refreshMembers(): Promise<void> {
  const fresh = await myHousehold();
  if (!fresh.ok) return;
  if (!fresh.value) {
    // Removed from the household elsewhere (or it was deleted): keep the kitchen, stop sharing.
    stopSync();
    useHousehold.setState({ ...EMPTY_HOUSEHOLD });
    return;
  }
  useHousehold.setState({ household: fresh.value });
}

/** Starts syncing if this phone is in a household. Safe to call more than once. */
export function startSync(): void {
  engine.start();
}

export function stopSync(): void {
  engine.stop();
}

/** @internal Shared with householdActions: signs in and remembers who this phone is. */
export async function signIn(): Promise<Result<string>> {
  const me = await signedInUser();
  if (me.ok) useHousehold.setState({ userId: me.value });
  return me;
}

export { adoptHousehold, inviteCode, joinWithCode, leave, startHousehold } from './householdActions';
export type { Household, Problem } from '@/lib/household';
