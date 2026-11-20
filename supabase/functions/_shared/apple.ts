// Sign in with Apple's REST API, for revoking tokens when an account is
// deleted (SEC-03, REL-04; Apple guideline 5.1.1(v)).
//
// SCAFFOLD ONLY. NOT DEPLOYED. It needs Lachlan's Sign in with Apple key:
//   1. Apple Developer › Keys › new key with "Sign in with Apple", for the
//      App ID com.lachlanoldfield.thepantry. Download the .p8 once.
//   2. Store these as Supabase function secrets (never in the repo):
//        APPLE_TEAM_ID       the 10-character team id
//        APPLE_KEY_ID        the new key's id
//        APPLE_PRIVATE_KEY   the .p8 file's contents
//        APPLE_CLIENT_ID     com.lachlanoldfield.thepantry
//   3. Create the private table (SQL editor):
//        create table private.apple_tokens (
//          user_id uuid primary key references auth.users (id) on delete cascade,
//          refresh_token text not null,
//          updated_at timestamptz not null default now()
//        );
//        -- No grants: only the service role (these functions) can read it.
//   4. supabase functions deploy apple-token delete-account
//   5. In the app (src/lib/account.ts): after Apple sign-in, send
//      credential.authorizationCode to apple-token; for deletion, call
//      delete-account instead of the delete_account RPC.

const APPLE = 'https://appleid.apple.com';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing secret ${name}`);
  return value;
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const text64url = (text: string) => base64url(new TextEncoder().encode(text));

/** The client secret Apple wants: a JWT signed with the .p8 key (ES256), valid for five minutes. */
export async function clientSecret(): Promise<string> {
  const pem = env('APPLE_PRIVATE_KEY')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = text64url(JSON.stringify({ alg: 'ES256', kid: env('APPLE_KEY_ID') }));
  const claims = text64url(
    JSON.stringify({ iss: env('APPLE_TEAM_ID'), iat: now, exp: now + 300, aud: APPLE, sub: env('APPLE_CLIENT_ID') }),
  );
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}

/** Swaps the one-time authorization code from the app for a refresh token. */
export async function refreshTokenFor(authorizationCode: string): Promise<string | undefined> {
  const body = new URLSearchParams({
    client_id: env('APPLE_CLIENT_ID'),
    client_secret: await clientSecret(),
    code: authorizationCode,
    grant_type: 'authorization_code',
  });
  const res = await fetch(`${APPLE}/auth/token`, { method: 'POST', body });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { refresh_token?: string };
  return json.refresh_token;
}

/** Tells Apple to forget the app's access for this user. */
export async function revoke(refreshToken: string): Promise<boolean> {
  const body = new URLSearchParams({
    client_id: env('APPLE_CLIENT_ID'),
    client_secret: await clientSecret(),
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  const res = await fetch(`${APPLE}/auth/revoke`, { method: 'POST', body });
  return res.ok;
}
