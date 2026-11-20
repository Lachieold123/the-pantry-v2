// What the Household screen does (D-039): start a household, join one,
// invite someone, leave. The sync itself is in ./household.
import { changedRows, EMPTY_KITCHEN, mergeRows, rowsToBringAlong } from '@/domain/sync/rows';
import {
  createHousehold,
  createInvite,
  joinHousehold,
  leaveHousehold,
  myHousehold,
  previewInvite,
  pullRows,
  removeMember as removeOnServer,
  revokeInvites,
  type Household,
  type InvitePreview,
  type Problem,
  type Result,
} from '@/lib/household';
import { deleteAccount as deleteUser } from '@/lib/account';
import {
  applyMirror,
  EMPTY_HOUSEHOLD,
  householdFlush,
  householdWaiting,
  localKitchen,
  record,
  resetLastKitchen,
  signIn,
  startSync,
  stoppedSharing,
  stopSync,
  useHousehold,
} from './household';
import { keptRows } from './sync';

/** Start a household with your kitchen in it. */
export async function startHousehold(name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const made = await createHousehold(name);
  if (!made.ok) return made.problem === 'already-in-household' ? recover(me.value, made) : made;
  const house = await myHousehold();
  if (!house.ok || !house.value) return house.ok ? { ok: false, problem: 'failed' } : house;
  useHousehold.setState({ ...EMPTY_HOUSEHOLD, household: house.value, rejoin: undefined });
  resetLastKitchen();
  record(changedRows(EMPTY_KITCHEN, localKitchen(), Date.now(), me.value));
  startSync();
  return { ok: true, value: house.value };
}

/**
 * Takes up a household this user is a member of: the household's kitchen
 * comes first, plus anything of this phone's it doesn't have yet. Used when
 * joining, and when signing in on a phone to an account that's already in one (D-043).
 */
export async function adoptHousehold(house: Household, userId: string): Promise<Result<Household>> {
  // One adoption at a time: two at launch (recovery and the account's check) would pull twice (DATA-16).
  adopting ??= adopt(house, userId).finally(() => {
    adopting = undefined;
  });
  return adopting;
}

let adopting: Promise<Result<Household>> | undefined;

async function adopt(house: Household, userId: string): Promise<Result<Household>> {
  const rows = await pullRows(house.id);
  if (!rows.ok) return rows;
  // Weeks the plan has let go of don't come back (DATA-15).
  const mirror = mergeRows({}, keptRows(rows.value));
  // Changes made before this phone dropped out of this same household go out now (DATA-4).
  const { unsent } = useHousehold.getState();
  const carried = unsent?.householdId === house.id ? Object.values(unsent.rows) : [];
  useHousehold.setState({ ...EMPTY_HOUSEHOLD, household: house, mirror, userId, rejoin: undefined, unsent: undefined });
  const mine = localKitchen();
  applyMirror();
  // Carried first, so a fresher bring-along row for the same record is the one that waits to send.
  record([...carried, ...rowsToBringAlong(mirror, mine, Date.now(), userId)]);
  applyMirror();
  startSync();
  return { ok: true, value: house };
}

/** Join with an invite code: the household's kitchen, plus anything of yours it doesn't have yet. */
export async function joinWithCode(code: string, name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const joined = await joinHousehold(code, name);
  if (!joined.ok) return joined.problem === 'already-in-household' ? recover(me.value, joined) : joined;
  const house = await myHousehold();
  if (!house.ok || !house.value) return house.ok ? { ok: false, problem: 'failed' } : house;
  return adoptHousehold(house.value, me.value);
}

/**
 * The server says this phone is already in a household, but the phone doesn't
 * know it: an earlier start or join went through and the answer was lost
 * (BUG-10). Take that household up rather than leave the phone stuck.
 */
async function recover(userId: string, problem: { ok: false; problem: Problem }): Promise<Result<Household>> {
  const house = await myHousehold();
  if (!house.ok || !house.value) return problem;
  return adoptHousehold(house.value, userId);
}

/** At launch: a phone that has signed in for a household but doesn't think it's in one checks with the server. */
export async function recoverHousehold(): Promise<void> {
  const { household, userId } = useHousehold.getState();
  if (household || !userId) return;
  const house = await myHousehold();
  if (house.ok && house.value && !useHousehold.getState().household) await adoptHousehold(house.value, userId);
}

/** A link and code to send someone. */
export async function inviteCode(): Promise<Result<string>> {
  return createInvite();
}

/** Which household a code is for, before joining (SEC-16). */
export function inviteFor(code: string): Promise<Result<InvitePreview | undefined>> {
  return previewInvite(code);
}

/** Cancels the household's unused invite codes (SEC-08). */
export function cancelInvites(): Promise<Result<null>> {
  return revokeInvites();
}

/** Takes someone else out of the household (SEC-15), then shows the list without them. */
export async function removeMember(userId: string): Promise<Result<null>> {
  const removed = await removeOnServer(userId);
  if (!removed.ok) return removed;
  const fresh = await myHousehold();
  if (fresh.ok && fresh.value) useHousehold.setState({ household: fresh.value });
  return removed;
}

/**
 * For a phone that shared a kitchen without an account (the quiet anonymous
 * user): deletes that user and everything the server keeps for it, leaving
 * any household first. The plan, list and cupboard stay on this phone.
 */
export async function deleteHouseholdData(): Promise<Result<null>> {
  const sent = await sendWaiting();
  if (!sent.ok) return sent;
  const gone = await deleteUser();
  if (!gone.ok) return { ok: false, problem: gone.problem === 'offline' ? 'offline' : 'failed' };
  stopSync();
  useHousehold.setState({ ...stoppedSharing(), userId: undefined, rejoin: undefined, lastSyncedAt: undefined, unsent: undefined });
  return { ok: true, value: null };
}

/** Changes still waiting go out first, so the others get them; refused (`unsent`) rather than lost while they can't (DATA-7). */
async function sendWaiting(): Promise<Result<null>> {
  if (householdWaiting() > 0) await householdFlush();
  return householdWaiting() > 0 ? { ok: false, problem: 'unsent' } : { ok: true, value: null };
}

/** Leave: this phone keeps its plan, list and cupboard as they are, and stops sharing. */
export async function leave(): Promise<Result<null>> {
  const sent = await sendWaiting();
  if (!sent.ok) return sent;
  const left = await leaveHousehold();
  if (!left.ok) return left;
  stopSync();
  useHousehold.setState(stoppedSharing());
  return left;
}
