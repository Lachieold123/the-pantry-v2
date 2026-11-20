// Deletes the signed-in account: revokes Sign in with Apple first (Apple
// requires it, SEC-03 / REL-04), then runs delete_account() as the user, so
// the same clean-up as today happens (household, rows, profile, auth user).
// SCAFFOLD ONLY, NOT DEPLOYED: setup in ../_shared/apple.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

import { revoke } from '../_shared/apple.ts';

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data } = await admin.auth.getUser(auth.replace(/^Bearer /, ''));
  if (!data.user) return new Response('not signed in', { status: 401 });

  const saved = await admin.schema('private').from('apple_tokens').select('refresh_token').eq('user_id', data.user.id).maybeSingle();
  // An Apple account must be revoked; if Apple can't be reached, stop and let the app say "try again".
  if (saved.data?.refresh_token && !(await revoke(saved.data.refresh_token))) return new Response('apple unreachable', { status: 502 });

  // As the user, so delete_account() acts on auth.uid() exactly as the app's RPC does today.
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
  const { error } = await asUser.rpc('delete_account');
  return error ? new Response(error.message, { status: 500 }) : new Response(null, { status: 204 });
});
