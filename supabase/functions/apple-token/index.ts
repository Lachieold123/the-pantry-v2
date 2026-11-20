// Keeps the Apple refresh token for the signed-in user, so deletion can revoke
// it later (SEC-03). SCAFFOLD ONLY, NOT DEPLOYED: setup in ../_shared/apple.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

import { refreshTokenFor } from '../_shared/apple.ts';

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data } = await admin.auth.getUser(auth.replace(/^Bearer /, ''));
  if (!data.user) return new Response('not signed in', { status: 401 });
  const { authorizationCode } = (await req.json().catch(() => ({}))) as { authorizationCode?: string };
  if (!authorizationCode) return new Response('no code', { status: 400 });
  const token = await refreshTokenFor(authorizationCode);
  if (!token) return new Response('apple refused the code', { status: 502 });
  const { error } = await admin
    .schema('private')
    .from('apple_tokens')
    .upsert({ user_id: data.user.id, refresh_token: token, updated_at: new Date().toISOString() });
  return error ? new Response('could not save', { status: 500 }) : new Response(null, { status: 204 });
});
