// What the Household screen does (D-039): start a household, join one,
// invite someone, leave. The sync itself is in ./household.
import { changedRows, mergeRows, rowsToBringAlong } from '@/domain/household/rows';
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
import { applyMirror, localKitchen, record, resetLastKitchen, signIn, startSync, stopSync, useHousehold } from './household';

/** Start a household with your kitchen in it. */
export async function startHousehold(name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const made = await createHousehold(name);
  if (!made.ok) return made;
  const house = await myHousehold();
  if (!house.ok || !house.value) return house.ok ? { ok: false, problem: 'failed' } : house;
  useHousehold.setState({ household: house.value, mirror: {}, pending: {}, sharedRecipes: {} });
  resetLastKitchen();
  record(changedRows({ entries: [], listEdits: {}, cupboard: [], recipes: {} }, localKitchen(), Date.now(), me.value));
  startSync();
  return { ok: true, value: house.value };
}

/** Join with an invite code: the household's kitchen, plus anything of yours it doesn't have yet. */
export async function joinWithCode(code: string, name: string): Promise<Result<Household>> {
  const me = await signIn();
  if (!me.ok) return me;
  const joined = await joinHousehold(code, name);
  if (!joined.ok) return joined;
  const house = await myHousehold();
  if (!house.ok || !house.value) return house.ok ? { ok: false, problem: 'failed' } : house;
  const rows = await pullRows(house.value.id);
  if (!rows.ok) return rows;
  const mirror = mergeRows({}, rows.value);
  useHousehold.setState({ household: house.value, mirror, pending: {}, sharedRecipes: {} });
  const mine = localKitchen();
  applyMirror();
  record(rowsToBringAlong(mirror, mine, Date.now(), me.value));
  applyMirror();
  startSync();
  return { ok: true, value: house.value };
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
  useHousehold.setState({ household: undefined, mirror: {}, pending: {}, sharedRecipes: {}, status: 'idle' });
  return left;
}
