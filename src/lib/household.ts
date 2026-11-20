// Talking to the household backend (D-039): sign in quietly, make or join a
// household, and move rows. Every call answers with a result instead of
// throwing, so a dropped connection is a message on screen, never a crash.
import type { Row } from '@/domain/household/rows';
import { listenRows } from './liveRows';
import { pullSince, type Pulled } from './pullRows';
import { pushTo, type PushResult } from './pushRows';
import { supabase } from './supabase';

export type Member = { userId: string; name: string };
export type Household = { id: string; name: string; members: Member[] };

/** Why a household call didn't work, in words the screen can show. */
export type Problem =
  'offline' | 'sharing-off' | 'invite-not-found' | 'household-full' | 'already-in-household' | 'too-many-attempts' | 'failed';
export type Result<T> = { ok: true; value: T } | { ok: false; problem: Problem };

const fail = (problem: Problem): { ok: false; problem: Problem } => ({ ok: false, problem });

/** @internal Exported for its tests. */
export function problemFrom(message: string | undefined): Problem {
  const m = message ?? '';
  if (m.includes('invite-not-found')) return 'invite-not-found';
  if (m.includes('household-full')) return 'household-full';
  if (m.includes('already-in-household')) return 'already-in-household';
  if (m.includes('too-many-attempts')) return 'too-many-attempts';
  if (/anonymous sign-ins are disabled/i.test(m)) return 'sharing-off';
  if (/network|fetch|timed out|offline/i.test(m)) return 'offline';
  return 'failed';
}

/** This phone's id, signing in anonymously the first time (only when there's no saved sign-in at all). */
export async function signedInUser(): Promise<Result<string>> {
  try {
    const auth = supabase().auth;
    const { data, error } = await auth.getSession();
    if (data.session) return { ok: true, value: data.session.user.id };
    // A saved sign-in that couldn't be refreshed (a patchy network) is still this phone's.
    // Signing in anonymously now would replace it and quietly leave the household (BUG-16).
    if (error) return fail('offline');
    const signed = await auth.signInAnonymously();
    if (signed.error || !signed.data.user) return fail(problemFrom(signed.error?.message));
    return { ok: true, value: signed.data.user.id };
  } catch (e) {
    return fail(problemFrom(String(e)));
  }
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<Result<T>> {
  const me = await signedInUser();
  if (!me.ok) return me;
  try {
    const { data, error } = await supabase().rpc(name, args);
    if (error) return fail(problemFrom(error.message));
    return { ok: true, value: data as T };
  } catch (e) {
    return fail(problemFrom(String(e)));
  }
}

export const createHousehold = (displayName: string) => rpc<string>('create_household', { p_display_name: displayName });
export const createInvite = () => rpc<string>('create_invite');
/** A wrong code answers null rather than an error, so the server can count wrong tries (SEC-08). */
export async function joinHousehold(code: string, displayName: string): Promise<Result<string>> {
  const joined = await rpc<string | null>('join_household', { p_code: code, p_display_name: displayName });
  if (!joined.ok) return joined;
  return joined.value ? { ok: true, value: joined.value } : fail('invite-not-found');
}
export const leaveHousehold = () => rpc<null>('leave_household');
/** Cancels every unused code for this household (SEC-08). */
export const revokeInvites = () => rpc<null>('revoke_invites');
/** Takes someone else out of this household (SEC-15). */
export const removeMember = (userId: string) => rpc<null>('remove_member', { p_user: userId });

export type InvitePreview = { name: string; members: number };

/** Which household a code is for, before joining (SEC-16). Undefined when the code doesn't work. */
export async function previewInvite(code: string): Promise<Result<InvitePreview | undefined>> {
  const found = await rpc<{ household_name: string; member_count: number }[] | null>('preview_invite', { p_code: code });
  if (!found.ok) return found;
  const first = found.value?.[0];
  return { ok: true, value: first ? { name: String(first.household_name), members: Number(first.member_count) } : undefined };
}

/** The household this phone belongs to, with its members; undefined if none. */
export async function myHousehold(): Promise<Result<Household | undefined>> {
  const me = await signedInUser();
  if (!me.ok) return me;
  try {
    const mine = await supabase().from('household_members').select('household_id').eq('user_id', me.value).maybeSingle();
    if (mine.error) return fail(problemFrom(mine.error.message));
    if (!mine.data) return { ok: true, value: undefined };
    const id = String(mine.data.household_id);
    const [house, members] = await Promise.all([
      supabase().from('households').select('id, name').eq('id', id).single(),
      supabase().from('household_members').select('user_id, display_name, joined_at').eq('household_id', id).order('joined_at'),
    ]);
    if (house.error || members.error) return fail(problemFrom((house.error ?? members.error)?.message));
    return {
      ok: true,
      value: {
        id,
        name: String(house.data.name),
        members: (members.data ?? []).map((m) => ({ userId: String(m.user_id), name: String(m.display_name) })),
      },
    };
  } catch (e) {
    return fail(problemFrom(String(e)));
  }
}

/** Rows the server received after `after` (every row when undefined), with the newest stamp among them (K-36). */
export async function pullRowsSince(householdId: string, after: number | undefined): Promise<Result<Pulled>> {
  const pulled = await pullSince('household_rows', { column: 'household_id', id: householdId }, after);
  return pulled.ok ? pulled : fail(problemFrom(pulled.error.message));
}

/** Every row of the household. */
export async function pullRows(householdId: string): Promise<Result<Row[]>> {
  const pulled = await pullRowsSince(householdId, undefined);
  return pulled.ok ? { ok: true, value: pulled.value.rows } : pulled;
}

/** Sends rows. The server keeps whichever version of a row is newest. */
export function pushRows(householdId: string, userId: string, rows: readonly Row[]): Promise<PushResult> {
  return pushTo('household_rows', { household_id: householdId }, userId, rows, 'household_id,kind,key');
}

/**
 * Calls back with each row another phone writes, over the household's private
 * topic (K-32). The member list isn't published (SEC-06): the store re-reads
 * it on return to the app and when a row arrives from someone it doesn't
 * know. Returns a stop function.
 */
export function listen(householdId: string, onRow: (row: Row) => void): () => void {
  return listenRows({ scope: 'household', id: householdId }, onRow);
}
