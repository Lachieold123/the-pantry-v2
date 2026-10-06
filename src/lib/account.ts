// Talking to Supabase Auth and the account's rows (D-043). Like
// lib/household, every call answers with a result instead of throwing, so a
// dropped connection or a cancelled sheet is a message (or nothing), never a crash.
//
// Signing in turns this phone's quiet anonymous user into a permanent one
// when it can (linking Apple, or confirming an email), so the user id, and
// any household, stay the same. When the Apple ID or email already has an
// account, it switches to that account instead and says so (`switched`), and
// the store merges this phone into it.
import * as AppleAuthentication from 'expo-apple-authentication';
import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';

import type { Row, RowKind } from '@/domain/sync/rows';
import { supabase } from './supabase';

export type Account = {
  id: string;
  email: string | undefined;
  /** Signed in with Apple (the email may be Apple's private relay). */
  apple: boolean;
  name: string | undefined;
};

export type Problem = 'offline' | 'cancelled' | 'code-wrong' | 'code-expired' | 'email-invalid' | 'too-many' | 'sign-ins-off' | 'failed';
export type Result<T> = { ok: true; value: T } | { ok: false; problem: Problem };
export type SignedIn = { account: Account; switched: boolean };
/** Which kind of code was sent, so the check uses the same kind. */
export type CodeKind = 'email_change' | 'email';

const fail = (problem: Problem): { ok: false; problem: Problem } => ({ ok: false, problem });

type Failure = { message?: string; code?: string | undefined; name?: string } | null | undefined;

function problemFrom(e: Failure | unknown): Problem {
  const err = (typeof e === 'object' && e !== null ? e : { message: String(e) }) as NonNullable<Failure>;
  const code = err.code ?? '';
  const m = err.message ?? '';
  if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return 'cancelled';
  if (err.name === 'AuthRetryableFetchError' || /network|fetch|timed out|offline/i.test(m)) return 'offline';
  if (code === 'otp_expired' || /token has expired or is invalid/i.test(m)) return 'code-wrong';
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(m)) return 'email-invalid';
  if (code.startsWith('over_') || /rate limit/i.test(m)) return 'too-many';
  if (
    ['manual_linking_disabled', 'provider_disabled', 'email_provider_disabled', 'otp_disabled', 'signup_disabled'].includes(code) ||
    /disabled|not enabled/i.test(m)
  )
    return 'sign-ins-off';
  return 'failed';
}

async function attempt<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch (e) {
    return fail(problemFrom(e));
  }
}

const isAnonymous = (user: User) => user.is_anonymous === true;

async function displayName(user: User): Promise<string | undefined> {
  const { data } = await supabase().from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
  const saved = typeof data?.display_name === 'string' ? data.display_name : undefined;
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  const fromMeta = typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : undefined;
  return saved || fromMeta || undefined;
}

async function accountOf(user: User): Promise<Account> {
  const providers = (user.identities ?? []).map((i) => i.provider);
  // The name is a nicety: if it can't be read now, it's read next time.
  const name = await displayName(user).catch(() => undefined);
  return { id: user.id, email: user.email || undefined, apple: providers.includes('apple'), name };
}

async function session(): Promise<Session | null> {
  const { data } = await supabase().auth.getSession();
  return data.session;
}

/** Who is signed in permanently on this phone; undefined when nobody is (or only the quiet anonymous user). */
export function currentAccount(): Promise<Result<Account | undefined>> {
  return attempt(async () => {
    const s = await session();
    if (!s || isAnonymous(s.user)) return { ok: true, value: undefined };
    return { ok: true, value: await accountOf(s.user) };
  });
}

/** Loads the saved sign-in; true if it's a permanent one. */
export async function sessionReady(): Promise<boolean> {
  try {
    const s = await session();
    return s !== null && !isAnonymous(s.user);
  } catch {
    return false;
  }
}

/** Sign in with Apple is only offered where it works: an iPhone with the capability, never the web or Android. */
export async function appleAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Saves a name to the profile. Apple only gives the name the first time, so it's kept then. */
export function saveDisplayName(userId: string, name: string): Promise<Result<null>> {
  return attempt(async () => {
    const { error } = await supabase()
      .from('profiles')
      .upsert({ user_id: userId, display_name: name.trim().slice(0, 80) });
    return error ? fail(problemFrom(error)) : { ok: true, value: null };
  });
}

/** Apple's sheet, then link or sign in. Cancelling answers `cancelled`, which screens ignore. */
export function continueWithApple(): Promise<Result<SignedIn>> {
  return attempt(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    const token = credential.identityToken;
    if (!token) return fail('failed');
    const auth = supabase().auth;
    const before = await session();
    let switched = true;
    let user: User | undefined;
    if (before && isAnonymous(before.user)) {
      const linked = await auth.linkIdentity({ provider: 'apple', token });
      if (!linked.error) {
        switched = false;
        user = linked.data.user ?? undefined;
      } else if (linked.error.code !== 'identity_already_exists' && !/already/i.test(linked.error.message)) {
        return fail(problemFrom(linked.error));
      }
    }
    if (!user) {
      const signed = await auth.signInWithIdToken({ provider: 'apple', token });
      if (signed.error || !signed.data.user) return fail(problemFrom(signed.error));
      user = signed.data.user;
      switched = before?.user.id !== user.id;
    }
    const given = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName).trim() : '';
    if (given) await saveDisplayName(user.id, given);
    // The linked user may not carry the new identity yet; read it fresh.
    const fresh = (await auth.getUser()).data.user ?? user;
    return { ok: true, value: { account: await accountOf(fresh), switched } };
  });
}

/**
 * Sends a 6-digit code. For the quiet anonymous user, it asks to add the email
 * to that same user (an email-change code). If the email already has an
 * account, that fails, and it sends a sign-in code for that account instead.
 */
export function sendEmailCode(email: string): Promise<Result<CodeKind>> {
  return attempt(async () => {
    const auth = supabase().auth;
    const s = await session();
    if (s && isAnonymous(s.user)) {
      const changed = await auth.updateUser({ email });
      if (!changed.error) return { ok: true, value: 'email_change' };
      const taken = changed.error.code === 'email_exists' || /already (been )?registered|already exists/i.test(changed.error.message);
      if (!taken) return fail(problemFrom(changed.error));
      const sent = await auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      return sent.error ? fail(problemFrom(sent.error)) : { ok: true, value: 'email' };
    }
    const sent = await auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return sent.error ? fail(problemFrom(sent.error)) : { ok: true, value: 'email' };
  });
}

/** Checks the code. `switched` is true when it signed in to a different user than this phone had. */
export function verifyEmailCode(email: string, code: string, kind: CodeKind): Promise<Result<SignedIn>> {
  return attempt(async () => {
    const before = (await session())?.user.id;
    const { data, error } = await supabase().auth.verifyOtp({ email, token: code, type: kind });
    if (error || !data.user) return fail(problemFrom(error));
    return { ok: true, value: { account: await accountOf(data.user), switched: before !== data.user.id } };
  });
}

/** Forgets the sign-in on this phone only. Works offline: the session is just removed. */
export function signOut(): Promise<Result<null>> {
  return attempt(async () => {
    const { error } = await supabase().auth.signOut({ scope: 'local' });
    return error ? fail(problemFrom(error)) : { ok: true, value: null };
  });
}

/** Leaves any household, deletes the account's rows and profile and the user itself (the RPC), then signs out here. */
export function deleteAccount(): Promise<Result<null>> {
  return attempt(async () => {
    const { error } = await supabase().rpc('delete_account');
    if (error) return fail(problemFrom(error));
    await supabase()
      .auth.signOut({ scope: 'local' })
      .catch(() => undefined);
    return { ok: true, value: null };
  });
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

/** Every row of the account, a page at a time. */
export function pullAccountRows(userId: string): Promise<Result<Row[]>> {
  return attempt(async () => {
    const page = 1000;
    const out: Row[] = [];
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase()
        .from('account_rows')
        .select('kind, key, data, deleted, updated_at, updated_by')
        .eq('user_id', userId)
        .order('updated_at')
        .range(from, from + page - 1);
      if (error) return fail(problemFrom(error));
      out.push(...(data as DbRow[]).map(fromDb));
      if (!data || data.length < page) return { ok: true, value: out };
    }
  });
}

/** Sends rows. The server keeps whichever version of a row is newest. `by` names this phone, so two phones can break a tie. */
export function pushAccountRows(userId: string, by: string, rows: readonly Row[]): Promise<Result<null>> {
  if (rows.length === 0) return Promise.resolve({ ok: true, value: null });
  return attempt(async () => {
    const { error } = await supabase()
      .from('account_rows')
      .upsert(
        rows.map((r) => ({
          user_id: userId,
          kind: r.kind,
          key: r.key,
          data: r.data,
          deleted: r.deleted,
          updated_at: r.updatedAt,
          updated_by: by,
        })),
        { onConflict: 'user_id,kind,key' },
      );
    return error ? fail(problemFrom(error)) : { ok: true, value: null };
  });
}

/** Calls back with each row another phone on the same account writes. Returns a stop function. */
export function listenAccount(userId: string, onRow: (row: Row) => void): () => void {
  const channel: RealtimeChannel = supabase()
    .channel(`account:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'account_rows', filter: `user_id=eq.${userId}` }, (payload) => {
      if (payload.new && typeof payload.new === 'object' && 'kind' in payload.new) onRow(fromDb(payload.new as DbRow));
    })
    .subscribe();
  return () => {
    void supabase().removeChannel(channel);
  };
}
