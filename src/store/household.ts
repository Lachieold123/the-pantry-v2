// Your household (D-039): who you share a kitchen with, and the sync that
// keeps everyone's plan, list and cupboard the same.
//
// The plan, list and cupboard stores stay the app's truth on this phone; this
// store keeps a mirror of the household's rows beside them. A change here
// becomes a few rows (domain/household/rows), saved to the mirror at once and
// sent when the network allows; rows from another phone merge into the mirror
// ("newest wins") and the stores are rebuilt from it. Offline, everything
// still works and catches up later.
import { AppState } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { changedRows, kitchenFromRows, mergeRows, plannedOwnRecipes, type Row, type SharedKitchen } from '@/domain/household/rows';
import { listen, myHousehold, pullRows, pushRows, signedInUser, type Household, type Result } from '@/lib/household';
import { useCupboard } from './cupboard';
import { useMyRecipes, type MyRecipe } from './myRecipes';
import { usePlan } from './plan';
import { persistentStorage, STORAGE_PREFIX } from './storage';

export type SyncStatus = 'idle' | 'syncing' | 'offline';

type HouseholdState = {
  household: Household | undefined;
  userId: string | undefined;
  /** The household's rows as this phone last knew them, including its own unsent ones. */
  mirror: Record<string, Row>;
  /** Rows waiting to be sent, newest per record. */
  pending: Record<string, Row>;
  /** Other members' own recipes that the shared plan uses, so this phone can show them. */
  sharedRecipes: Record<string, MyRecipe>;
  status: SyncStatus;
  lastSyncedAt: number | undefined;
};

export const useHousehold = create<HouseholdState>()(
  persist(
    (): HouseholdState => ({
      household: undefined,
      userId: undefined,
      mirror: {},
      pending: {},
      sharedRecipes: {},
      status: 'idle',
      lastSyncedAt: undefined,
    }),
    {
      name: `${STORAGE_PREFIX}/household`,
      version: 1,
      storage: persistentStorage(),
      partialize: ({ household, userId, mirror, pending, sharedRecipes, lastSyncedAt }) => ({
        household,
        userId,
        mirror,
        pending,
        sharedRecipes,
        lastSyncedAt,
      }),
    },
  ),
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

let applying = false;
let lastKitchen: SharedKitchen | undefined;

/** Rebuilds the plan, list and cupboard from the mirror. */
/** @internal Shared with householdActions. */
export function applyMirror(): void {
  const kitchen = kitchenFromRows(Object.values(useHousehold.getState().mirror));
  const own = useMyRecipes.getState().recipes;
  const sharedRecipes = Object.fromEntries(Object.entries(kitchen.recipes).filter(([id, r]) => !own[id] && isMyRecipe(r))) as Record<
    string,
    MyRecipe
  >;
  applying = true;
  try {
    useHousehold.setState({ sharedRecipes });
    usePlan.setState({ entries: [...kitchen.entries], listEdits: { ...kitchen.listEdits } });
    useCupboard.setState({ items: [...kitchen.cupboard] });
  } finally {
    applying = false;
  }
  lastKitchen = localKitchen();
}

/** @internal Shared with householdActions. */
export function record(rows: readonly Row[]): void {
  if (!rows.length) return;
  useHousehold.setState((s) => {
    const pending = { ...s.pending };
    for (const r of rows) pending[`${r.kind}:${r.key}`] = r;
    return { mirror: mergeRows(s.mirror, rows), pending };
  });
  scheduleFlush();
}

/** A change made on this phone. */
function onLocalChange(): void {
  if (applying || !useHousehold.getState().household) return;
  const next = localKitchen();
  const rows = changedRows(lastKitchen ?? next, next, Date.now(), useHousehold.getState().userId);
  lastKitchen = next;
  record(rows);
}

/** Rows written by another phone (or pulled at start). */
function onRemoteRows(rows: readonly Row[]): void {
  const before = useHousehold.getState().mirror;
  const mirror = mergeRows(before, rows);
  if (mirror === before) return;
  useHousehold.setState({ mirror });
  applyMirror();
}

// — Sending.

let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushing = false;

function scheduleFlush(delay = 400): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), delay);
}

async function flush(): Promise<void> {
  const { household, userId, pending } = useHousehold.getState();
  const rows = Object.values(pending);
  if (!household || !userId || flushing || !rows.length) return;
  flushing = true;
  useHousehold.setState({ status: 'syncing' });
  const sent = await pushRows(household.id, userId, rows);
  flushing = false;
  if (!sent.ok) {
    useHousehold.setState({ status: 'offline' });
    scheduleFlush(30_000);
    return;
  }
  // Keep anything that changed again while this batch was in flight.
  useHousehold.setState((s) => {
    const left = { ...s.pending };
    for (const r of rows) {
      const id = `${r.kind}:${r.key}`;
      if (left[id] === r) delete left[id];
    }
    return { pending: left, status: 'idle', lastSyncedAt: Date.now() };
  });
  if (Object.keys(useHousehold.getState().pending).length) scheduleFlush();
}

async function pull(): Promise<void> {
  const { household } = useHousehold.getState();
  if (!household) return;
  const rows = await pullRows(household.id);
  if (!rows.ok) {
    useHousehold.setState({ status: 'offline' });
    return;
  }
  onRemoteRows(rows.value);
  useHousehold.setState({ lastSyncedAt: Date.now() });
}

async function refreshMembers(): Promise<void> {
  const fresh = await myHousehold();
  if (!fresh.ok) return;
  if (!fresh.value) {
    // Removed from the household elsewhere (or it was deleted): keep the kitchen, stop sharing.
    stopSync();
    useHousehold.setState({ household: undefined, mirror: {}, pending: {}, sharedRecipes: {} });
    return;
  }
  useHousehold.setState({ household: fresh.value });
}

// — Running the sync while the app is open.

let stops: (() => void)[] = [];
let starting = false;

/** Starts syncing if this phone is in a household. Safe to call more than once. */
export function startSync(): void {
  if (!useHousehold.getState().household || stops.length || starting) return;
  starting = true;
  // The saved sign-in loads first, so the live connection carries it and row security lets the rows through.
  void signIn().then(() => {
    starting = false;
    const { household } = useHousehold.getState();
    if (!household || stops.length) return;
    lastKitchen = localKitchen();
    // Anything changed here before the sync started (it shouldn't be much) goes out first.
    onLocalChange();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pull().then(flush);
    });
    stops = [
      usePlan.subscribe(onLocalChange),
      useCupboard.subscribe(onLocalChange),
      useMyRecipes.subscribe(onLocalChange),
      listen(
        household.id,
        (row) => onRemoteRows([row]),
        () => void refreshMembers(),
      ),
      () => appState.remove(),
    ];
    void pull().then(flush);
    void refreshMembers();
  });
}

export function stopSync(): void {
  for (const stop of stops) stop();
  stops = [];
  if (flushTimer) clearTimeout(flushTimer);
}

/** @internal Shared with householdActions: signs in and remembers who this phone is. */
export async function signIn(): Promise<Result<string>> {
  const me = await signedInUser();
  if (me.ok) useHousehold.setState({ userId: me.value });
  return me;
}

/** @internal Shared with householdActions. */
export function resetLastKitchen(): void {
  lastKitchen = undefined;
}

export { inviteCode, joinWithCode, leave, startHousehold } from './householdActions';
export type { Household, Problem } from '@/lib/household';
