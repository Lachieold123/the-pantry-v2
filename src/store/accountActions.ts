// Signing in, out, and deleting the account (D-043).
//
// Signing in to an account that already has things in it merges this phone
// into it: the account's records come first, and anything on this phone the
// account doesn't have is added (the bring-along rule, domain/sync). A brand
// new account is the same thing with nothing there yet, so everything comes along.
import { codeProblem, cleanCode, cleanEmail, looksLikeEmail } from '@/domain/account/account';
import { mergeRows, rowsToBringAlong } from '@/domain/sync/rows';
import {
  continueWithApple,
  currentAccount,
  deleteAccount as deleteOnServer,
  pullAccountRows,
  sendEmailCode,
  signOut as signOutHere,
  verifyEmailCode,
  type Account,
  type Problem,
  type SignedIn,
} from '@/lib/account';
import { myHousehold } from '@/lib/household';
import { signedOutState, useAccount, watchOffers } from './account';
import { accountEngine, accountSnapshot } from './accountSync';
import {
  adoptHousehold,
  householdFlush,
  householdSetAside,
  householdWaiting,
  lapse,
  stopSync as stopHousehold,
  useHousehold,
} from './household';
import { resetThisPhone, wipeAfterDeletion } from './reset';
import { keptRows } from './sync';

/**
 * Why an account action didn't happen. `unsaved`: changes are still waiting to send, so signing out would lose them.
 * `not-backed-up`: the server refused something (too big), so it's only on this phone.
 */
export type AccountProblem = Problem | 'unsaved' | 'not-backed-up';
export type AccountResult<T> = { ok: true; value: T } | { ok: false; problem: AccountProblem };
const MERGE_RETRY_MS = 30_000;
let mergeRetry: ReturnType<typeof setTimeout> | undefined;
const fail = (problem: AccountProblem): { ok: false; problem: AccountProblem } => ({ ok: false, problem });

/** Starts the account's side at launch: the once-only offers, and the backup if signed in. */
export function startAccount(): void {
  watchOffers();
  const { who, needsMerge } = useAccount.getState();
  if (!who) return;
  if (needsMerge) void merge();
  else accountEngine.start();
  void checkHousehold();
  void refreshWho();
}

/** Picks up a name or email changed elsewhere. If the sign-in has gone (deleted on another phone), stop backing up, keeping everything here. */
async function refreshWho(): Promise<void> {
  const fresh = await currentAccount();
  if (!fresh.ok || !useAccount.getState().who) return;
  if (fresh.value) useAccount.setState({ who: fresh.value });
  else {
    // Never silent (DATA-12): Settings and a toast ask to sign in again, and unsent changes wait for it.
    const s = useAccount.getState();
    accountEngine.stop();
    const rows = { ...(s.lapsed?.id === s.who?.id ? s.lapsed?.rows : {}), ...s.pending };
    useAccount.setState({ ...signedOutState(), lapsed: { id: s.who?.id ?? '', rows }, lapsedNotice: true });
  }
}

/** A signed-in phone that isn't in a household, whose account is in one (joined on another phone), takes it up. */
async function checkHousehold(): Promise<void> {
  const who = useAccount.getState().who;
  if (!who || useHousehold.getState().household) return;
  const house = await myHousehold();
  if (house.ok && house.value && !useHousehold.getState().household) await adoptHousehold(house.value, who.id);
}

/**
 * After switching to a different user, the household this phone was in
 * belonged to the old one. The account's own household (if any) is taken up
 * instead; otherwise the kitchen stays here and the Household page asks to rejoin.
 */
async function moveHousehold(userId: string): Promise<void> {
  // Unsent household changes are kept: back in the same household (a lapsed sign-in renewed), they go out (DATA-4).
  lapse(userId);
  const house = await myHousehold();
  if (house.ok && house.value) await adoptHousehold(house.value, userId);
}

/** The account's rows first, then whatever this phone has that they don't. Returns false if the account couldn't be reached. */
async function merge(): Promise<boolean> {
  const who = useAccount.getState().who;
  if (!who) return false;
  const pulled = await pullAccountRows(who.id);
  if (!pulled.ok) {
    useAccount.setState({ sync: 'offline' });
    // Try again shortly; the next launch tries too. One retry waiting at a time (PERF-3).
    if (mergeRetry) clearTimeout(mergeRetry);
    mergeRetry = setTimeout(() => {
      mergeRetry = undefined;
      if (useAccount.getState().needsMerge) void merge();
    }, MERGE_RETRY_MS);
    return false;
  }
  const theirs = keptRows(pulled.value);
  const { lapsed, device } = useAccount.getState();
  // Changes this phone hadn't sent before its sign-in lapsed go out now, if it's the same account (DATA-12).
  const kept = lapsed?.id === who.id ? Object.values(lapsed.rows) : [];
  const along = [...kept, ...rowsToBringAlong(mergeRows({}, theirs), accountSnapshot(), Date.now(), device)];
  // One rebuild with the merged result, so the stores never pass through empty on the way.
  // Old weeks the plan has let go of stay out (DATA-15).
  useAccount.setState({
    mirror: mergeRows(mergeRows({}, theirs), along),
    pending: {},
    needsMerge: false,
    lastSyncedAt: Date.now(),
    sync: 'idle',
    lapsed: undefined,
  });
  accountEngine.record(along);
  accountEngine.applyMirror();
  accountEngine.start();
  return true;
}

async function begin({ account, switched }: SignedIn): Promise<void> {
  useAccount.setState({ ...signedOutState(), status: 'signed-in', who: account, needsMerge: true, offer: undefined });
  if (switched) await moveHousehold(account.id);
  await merge();
}

function settle<T>(r: { ok: false; problem: Problem } | { ok: true; value: T }): void {
  if (!r.ok) useAccount.setState({ status: useAccount.getState().who ? 'signed-in' : 'signed-out' });
}

/** Apple's sheet, then sign in and merge. Cancelling changes nothing and says nothing. */
export async function signInWithApple(): Promise<AccountResult<Account>> {
  useAccount.setState({ status: 'signing-in' });
  const r = await continueWithApple();
  settle(r);
  if (!r.ok) return r;
  await begin(r.value);
  return { ok: true, value: r.value.account };
}

/** Sends a 6-digit code to the email. */
export async function sendCode(email: string): Promise<AccountResult<string>> {
  const clean = cleanEmail(email);
  if (!looksLikeEmail(clean)) return fail('email-invalid');
  const r = await sendEmailCode(clean);
  if (!r.ok) return r;
  useAccount.setState({ code: { email: clean, kind: r.value, sentAt: Date.now() } });
  return { ok: true, value: clean };
}

/** Checks the code, then signs in and merges. A wrong code and an old one are told apart by when it was sent. */
export async function verifyCode(typed: string): Promise<AccountResult<Account>> {
  const sent = useAccount.getState().code;
  if (!sent) return fail('code-expired');
  useAccount.setState({ status: 'signing-in' });
  const r = await verifyEmailCode(sent.email, cleanCode(typed), sent.kind);
  settle(r);
  if (!r.ok) return r.problem === 'code-wrong' ? fail(codeProblem(sent.sentAt, Date.now())) : r;
  await begin(r.value);
  return { ok: true, value: r.value.account };
}

/** Back to the email step ("Change email"). */
export function forgetCode(): void {
  useAccount.setState({ code: undefined });
}

/** A fresh install that skips the welcome: what a sign-out and a deletion leave. */
function clearThisPhone(): void {
  if (mergeRetry) clearTimeout(mergeRetry);
  mergeRetry = undefined;
  accountEngine.stop();
  stopHousehold();
  resetThisPhone();
  useAccount.setState({ ...signedOutState(), offer: undefined, lapsed: undefined, lapsedNotice: false });
}

/**
 * Signs out and clears this phone; everything is in the account. If changes
 * are still waiting to send (offline), it tries once, then refuses rather than lose them.
 */
export async function signOut(): Promise<AccountResult<null>> {
  // Never merged with the account yet (signed in offline): this phone's things aren't in it, so clearing would lose them.
  if (useAccount.getState().needsMerge) return fail('unsaved');
  if (accountEngine.waiting() + householdWaiting() > 0) {
    await Promise.all([accountEngine.flush(), householdFlush()]);
    if (accountEngine.waiting() + householdWaiting() > 0) return fail('unsaved');
  }
  // Something the server refused (a very long recipe) is only on this phone: clearing it would lose it for good (DATA-5).
  if (accountEngine.setAside() + householdSetAside() > 0) return fail('not-backed-up');
  const out = await signOutHere();
  if (!out.ok) return out;
  clearThisPhone();
  return { ok: true, value: null };
}

/** Deletes the account on the server (leaving any household), then clears this phone. */
export async function deleteAccount(): Promise<AccountResult<null>> {
  const gone = await deleteOnServer();
  if (!gone.ok) return gone;
  clearThisPhone();
  await wipeAfterDeletion();
  return { ok: true, value: null };
}
