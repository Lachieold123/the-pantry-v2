// A throwaway Postgres (PGlite) set up like Supabase, never the live project:
// anon and authenticated roles, Supabase's default grants, auth.uid() and
// auth.jwt(), and as much of Realtime's schema as Broadcast and Realtime
// Authorization use. Every migration is loaded in order. Each test file
// opens its own, so their data never meets.
//
// PGlite isn't an app dependency. Install it somewhere else and point at it:
//   (cd /tmp/pg && npm i @electric-sql/pglite@0.3.7)
//   PGLITE=/tmp/pg/node_modules/@electric-sql/pglite/dist/index.js node --test supabase/tests/*.test.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pgliteAt = process.env.PGLITE ?? '@electric-sql/pglite';
const { PGlite } = await import(pgliteAt);
// pgcrypto ships as a bundle beside PGlite; some versions have no wrapper for it, so name it directly.
const pgcrypto = { name: 'pgcrypto', setup: async () => ({ bundlePath: new URL('pgcrypto.tar.gz', pathToFileURL(pgliteAt)) }) };

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, '..', 'migrations');

const SUPABASE_LIKE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default false,
    created_at timestamptz not null default now(), last_sign_in_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema public, auth, extensions to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
  -- Realtime's own schema, as far as Broadcast from the database and Realtime Authorization use it.
  create schema realtime;
  create table realtime.messages (id uuid primary key default gen_random_uuid(), topic text not null, extension text not null,
    payload jsonb, event text, private boolean default false, inserted_at timestamptz not null default now());
  alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
  create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
  language plpgsql as $$
  begin
    begin
      perform set_config('realtime.topic', topic, true);
      insert into realtime.messages (payload, event, topic, private, extension) values (payload, event, topic, private, 'broadcast');
    exception when others then raise warning 'ErrorSendingBroadcastMessage: %', sqlerrm;
    end;
  end $$;
  grant usage on schema realtime to anon, authenticated;
  grant select, insert on realtime.messages to authenticated;
`;

export const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(SUPABASE_LIKE);
// UPTO=<file name> loads only the migrations up to that one: run with the last old one to see the exploits work.
const upto = process.env.UPTO ?? '~';
for (const file of readdirSync(migrations)
  .filter((f) => f.endsWith('.sql') && f <= upto)
  .sort()) {
  await db.exec(readFileSync(join(migrations, file), 'utf8'));
}

export const users = {
  alice: '11111111-1111-1111-1111-111111111111',
  bob: '22222222-2222-2222-2222-222222222222',
  mallory: '33333333-3333-3333-3333-333333333333',
  carol: '44444444-4444-4444-4444-444444444444',
  anon: '55555555-5555-5555-5555-555555555555',
};
for (const [name, id] of Object.entries(users)) {
  await db.query('insert into auth.users (id, is_anonymous) values ($1, $2)', [id, name === 'anon' || name === 'mallory']);
}

/** Runs SQL as a signed-in user, the way PostgREST does: role authenticated, the user's id in the JWT. */
export async function as(user, sql, params = []) {
  const claims = JSON.stringify({ sub: users[user], is_anonymous: user === 'anon' || user === 'mallory' });
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`, [
      users[user],
      claims,
    ]);
    await tx.exec('set local role authenticated');
    return tx.query(sql, params);
  });
}
export const fails = async (promise, pattern) => assert.rejects(promise, pattern);
export const now = () => Date.now();
