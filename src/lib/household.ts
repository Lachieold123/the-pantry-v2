// Talking to the household backend (D-039): sign in quietly, make or join a
// household, and move rows. Every call answers with a result instead of
// throwing, so a dropped connection is a message on screen, never a crash.
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Row, RowKind } from '@/domain/household/rows';
import { pushTo, type PushResult } from './pushRows';
import { supabase } from './supabase';

export type Member = { userId: string; name: string };
export type Household = { id: string; name: string; members: Member[] };

/** Why a household call didn't work, in words the screen can show. */
export type Problem = 'offline' | 'sharing-off' | 'invite-not-found' | 'household-full' | 'already-in-household' | 'failed';
export type Result<T> = { ok: true; value: T } | { ok: false; problem: Problem };

const fail = (problem: Problem): { ok: false; problem: Problem } => ({ ok: false, problem });

/** @internal Exported for its tests. */
export function problemFrom(message: string | undefined): Problem {
  const m = message ?? '';
  if (m.includes('invite-not-found')) return 'invite-not-found';
  if (m.includes('household-full')) return 'household-full';
  if (m.includes('already-in-household')) return 'already-in-household';
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
export const joinHousehold = (code: string, displayName: string) =>
  rpc<string>('join_household', { p_code: code, p_display_name: displayName });
export const leaveHousehold = () => rpc<null>('leave_household');

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

type DbRow = { kind: RowKind; key: string; data: unknown; deleted: boolean; updated_at: number; updated_by: string };
const fromDb = (r: DbRow): Row => ({
  kind: r.kind,
  key: r.key,
  data: r.data,
  deleted: r.deleted,
  updatedAt: Number(r.updated_at),
  updatedBy: r.updated_by,
});

/** Every row of the household, a page at a time. */
export async function pullRows(householdId: string): Promise<Result<Row[]>> {
  const page = 1000;
  const out: Row[] = [];
  try {
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase()
        .from('household_rows')
        .select('kind, key, data, deleted, updated_at, updated_by')
        .eq('household_id', householdId)
        // A total order (no ties), so paging past 1,000 rows never skips or repeats one.
        .order('updated_at')
        .order('kind')
        .order('key')
        .range(from, from + page - 1);
      if (error) return fail(problemFrom(error.message));
      out.push(...(data as DbRow[]).map(fromDb));
      if (!data || data.length < page) return { ok: true, value: out };
    }
  } catch (e) {
    return fail(problemFrom(String(e)));
  }
}

/** Sends rows. The server keeps whichever version of a row is newest. */
export function pushRows(householdId: string, userId: string, rows: readonly Row[]): Promise<PushResult> {
  return pushTo('household_rows', { household_id: householdId }, userId, rows, 'household_id,kind,key');
}

/** Calls back with each row another phone writes, and when the member list changes. Returns a stop function. */
export function listen(householdId: string, onRow: (row: Row) => void, onMembers: () => void): () => void {
  const channel: RealtimeChannel = supabase()
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'household_rows', filter: `household_id=eq.${householdId}` },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'kind' in payload.new) onRow(fromDb(payload.new as DbRow));
      },
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` }, () =>
      onMembers(),
    )
    .subscribe();
  return () => {
    void supabase().removeChannel(channel);
  };
}
