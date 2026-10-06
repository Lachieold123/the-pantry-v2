// What the Household screen does (D-039): start a household, join one,
// invite someone, leave. The sync itself is in ./household.
import { changedRows, EMPTY_KITCHEN, mergeRows, rowsToBringAlong } from '@/domain/sync/rows';
import {
  createHousehold,
  createInvite,
  joinHousehold,
  leaveHousehold,
  myHousehold,
  pullRows,
  type Household,
  type Result,
} from '@/lib/household';
import {
  applyMirror,
  EMPTY_HOUSEHOLD,
  localKitchen,
  record,
  resetLastKitchen,
  signIn,
  startSync,
  stopSync,
  useHousehold,
} from './household';

/** Start a household with your kitchen in it. */
export async function startHousehold(name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const made = await createHousehold(name);
  if (!made.ok) return made;
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
  const rows = await pullRows(house.id);
  if (!rows.ok) return rows;
  const mirror = mergeRows({}, rows.value);
  useHousehold.setState({ ...EMPTY_HOUSEHOLD, household: house, mirror, userId, rejoin: undefined });
  const mine = localKitchen();
  applyMirror();
  record(rowsToBringAlong(mirror, mine, Date.now(), userId));
  applyMirror();
  startSync();
  return { ok: true, value: house };
}

/** Join with an invite code: the household's kitchen, plus anything of yours it doesn't have yet. */
export async function joinWithCode(code: string, name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const joined = await joinHousehold(code, name);
  if (!joined.ok) return joined;
  const house = await myHousehold();
  if (!house.ok || !house.value) return house.ok ? { ok: false, problem: 'failed' } : house;
  return adoptHousehold(house.value, me.value);
}

/** A link and code to send someone. */
export async function inviteCode(): Promise<Result<string>> {
  return createInvite();
}

/** Leave: this phone keeps its plan, list and cupboard as they are, and stops sharing. */
export async function leave(): Promise<Result<null>> {
  const left = await leaveHousehold();
  if (!left.ok) return left;
  stopSync();
  useHousehold.setState({ ...EMPTY_HOUSEHOLD });
  return left;
}
