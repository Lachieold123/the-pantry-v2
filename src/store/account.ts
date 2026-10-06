// Your account (D-043): who's signed in, how the backup is going, and the
// once-only offers to sign in. Everything works signed out; an account backs
// up everything and brings it to a new phone.
//
// The account's rows and the sync are in ./accountSync, signing in and out
// in ./accountActions. Offers: each moment (starting or joining a household,
// the 10th Cookmark, the first recipe of your own) queues the sign-in sheet
// once, ever, and only while signed out.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { COOKMARKS_OFFER_AT, reached, type Moment } from '@/domain/account/account';
import type { Account, CodeKind } from '@/lib/account';
import { newId } from '@/lib/ids';
import { useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { useSaved } from './saved';
import { persistentStorage, STORAGE_PREFIX } from './storage';
import type { ScopeState, SyncStatus } from './sync';

export type AccountStatus = 'signed-out' | 'signing-in' | 'signed-in';
/** A code that's been sent and not yet checked. Kept, so a trip to the Mail app loses nothing. */
export type SentCode = { email: string; kind: CodeKind; sentAt: number };

type AccountState = Omit<ScopeState, 'status'> & {
  status: AccountStatus;
  /** How the backup is going (the sync engine's status). */
  sync: SyncStatus;
  who: Account | undefined;
  /** This install's name on the rows it writes, so two phones on one account break a tie the same way. */
  device: string;
  /** Signing in finished but the first merge with the account didn't (it went offline): it runs at the next start. */
  needsMerge: boolean;
  code: SentCode | undefined;
  /** Moments already offered: never again, whatever the answer was. */
  offered: Partial<Record<Moment, true>>;
  /** An offer waiting for the sign-in sheet to open. */
  offer: Moment | undefined;
};

/** The account as a fresh install has it. `device` and `offered` are kept by a sign-out. */
export function signedOutState(): Pick<
  AccountState,
  'status' | 'who' | 'needsMerge' | 'code' | 'mirror' | 'pending' | 'lastSyncedAt' | 'sync'
> {
  return {
    status: 'signed-out',
    who: undefined,
    needsMerge: false,
    code: undefined,
    mirror: {},
    pending: {},
    lastSyncedAt: undefined,
    sync: 'idle',
  };
}

export const useAccount = create<AccountState>()(
  persist((): AccountState => ({ ...signedOutState(), device: newId(), offered: {}, offer: undefined }), {
    name: `${STORAGE_PREFIX}/account`,
    version: 1,
    storage: persistentStorage(),
    // "Signing in" never survives a restart: it's signed in or it isn't.
    partialize: ({ who, device, needsMerge, code, offered, mirror, pending, lastSyncedAt }) => ({
      status: (who ? 'signed-in' : 'signed-out') as AccountStatus,
      who,
      device,
      needsMerge,
      code,
      offered,
      mirror,
      pending,
      lastSyncedAt,
    }),
  }),
);

/** Queues the sign-in sheet for a moment, once ever, and only while signed out. */
export function offerAccount(moment: Moment): void {
  const s = useAccount.getState();
  if (s.who || s.offered[moment]) return;
  useAccount.setState({ offered: { ...s.offered, [moment]: true }, offer: moment });
}

/** The waiting offer, now being shown. */
export function takeOffer(): Moment | undefined {
  const { offer } = useAccount.getState();
  if (offer) useAccount.setState({ offer: undefined });
  return offer;
}

let offerStops: (() => void)[] = [];

/** Watches for the moments that earn an offer. Hydration has finished by now, so loading saved data doesn't count. */
export function watchOffers(): void {
  if (offerStops.length) return;
  offerStops = [
    useHousehold.subscribe((s, prev) => {
      if (s.household && !prev.household) offerAccount('household');
    }),
    useSaved.subscribe((s, prev) => {
      if (reached(prev.bookmarks.length, s.bookmarks.length, COOKMARKS_OFFER_AT)) offerAccount('cookmarks');
    }),
    useMyRecipes.subscribe((s, prev) => {
      if (reached(Object.keys(prev.recipes).length, Object.keys(s.recipes).length, 1)) offerAccount('own-recipe');
    }),
  ];
}

export function stopWatchingOffers(): void {
  for (const stop of offerStops) stop();
  offerStops = [];
}
