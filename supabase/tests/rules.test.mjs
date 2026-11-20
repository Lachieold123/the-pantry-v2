// Database rules tested on a throwaway Postgres (PGlite), never the live project.
// Loads every migration in order into a Supabase-like setup (anon and
// authenticated roles, Supabase's default grants, auth.uid() and auth.jwt()),
// then runs the audit's exploits (8 October 2026) as those roles.
//
// PGlite isn't an app dependency. Install it somewhere else and point at it:
//   (cd /tmp/pg && npm i @electric-sql/pglite@0.3.7)
//   PGLITE=/tmp/pg/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/rules.test.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
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
`;

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(SUPABASE_LIKE);
// UPTO=<file name> loads only the migrations up to that one: run with the last old one to see the exploits work.
const upto = process.env.UPTO ?? '~';
for (const file of readdirSync(migrations)
  .filter((f) => f.endsWith('.sql') && f <= upto)
  .sort()) {
  await db.exec(readFileSync(join(migrations, file), 'utf8'));
}

const users = {
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
async function as(user, sql, params = []) {
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
const fails = async (promise, pattern) => assert.rejects(promise, pattern);
const now = () => Date.now();

const aliceHouse = (await as('alice', `select public.create_household('Alice') as id`)).rows[0].id;
const malloryHouse = (await as('mallory', `select public.create_household('Mallory') as id`)).rows[0].id;

test('SEC-01: a member cannot move into another household, unfiltered or filtered', async () => {
  await fails(as('mallory', 'update public.household_members set household_id = $1', [aliceHouse]), /permission denied|read-only/);
  await fails(
    as('mallory', 'update public.household_members set household_id = $1 where user_id = $2', [aliceHouse, users.mallory]),
    /permission denied|read-only/,
  );
  const members = await db.query('select user_id from public.household_members where household_id = $1', [aliceHouse]);
  assert.deepEqual(
    members.rows.map((r) => r.user_id),
    [users.alice],
  );
});

test('SEC-01: a member can still rename themselves and the household, but not rewrite who made it', async () => {
  await as('alice', `update public.household_members set display_name = 'Al' where user_id = $1`, [users.alice]);
  await as('alice', `update public.households set name = 'Our place' where id = $1`, [aliceHouse]);
  await fails(
    as('alice', 'update public.households set created_by = $1 where id = $2', [users.bob, aliceHouse]),
    /permission denied|read-only/,
  );
  assert.equal((await db.query('select name from public.households where id = $1', [aliceHouse])).rows[0].name, 'Our place');
});

test('SEC-04: a stamp far in the future is brought back, and later writes still land', async () => {
  const row = `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by) values ($1, 'cupboard', 'egg', $2, $3, $4)
    on conflict (household_id, kind, key) do update set data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`;
  await as('alice', row, [aliceHouse, { pwned: 1 }, '9000000000000000000', users.alice]);
  const stored = (await db.query(`select updated_at from public.household_rows where key = 'egg'`)).rows[0];
  assert.ok(Number(stored.updated_at) < now() + 300_001);
  await as('alice', row, [aliceHouse, { addedAt: 1, source: 'manual' }, now() + 1000, users.alice]);
  assert.deepEqual((await db.query(`select data from public.household_rows where key = 'egg'`)).rows[0].data, {
    addedAt: 1,
    source: 'manual',
  });
});

test('BUG-28: a same-millisecond tie goes to the larger author, like the phones', async () => {
  await as('bob', `select public.join_household('NOPE', 'Bob')`).catch(() => undefined);
  const t = now();
  const write = `insert into public.account_rows (user_id, kind, key, data, updated_at, updated_by) values ($1, 'hidden', 'pho', '{}', $2, $3)
    on conflict (user_id, kind, key) do update set updated_at = excluded.updated_at, updated_by = excluded.updated_by`;
  await as('alice', write, [users.alice, t, 'phone-b']);
  await as('alice', write, [users.alice, t, 'phone-a']);
  assert.equal((await db.query(`select updated_by from public.account_rows where key = 'pho'`)).rows[0].updated_by, 'phone-b');
});

test('SEC-05: a recipe row without its words is refused as a check violation', async () => {
  const insert = `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by) values ($1, 'recipe', 'x', $2, $3, $4)`;
  await fails(as('alice', insert, [aliceHouse, { id: 'x', draft: {} }, now(), users.alice]), (e) => e.code === '23514');
  const good = { id: 'x', draft: { title: 'Soup', ingredientsText: '1 onion', methodText: 'Cook.', mealTypes: ['dinner'] } };
  await as('alice', insert, [aliceHouse, good, now(), users.alice]);
});

test('SEC-07: an anonymous user cannot write account rows; a permanent one can', async () => {
  const insert = `insert into public.account_rows (user_id, kind, key, data, updated_at, updated_by) values ($1, 'hidden', 'k', '{}', $2, 'p')`;
  await fails(as('anon', insert, [users.anon, now()]), /row-level security/);
  await as('carol', insert, [users.carol, now()]);
});

test('SEC-08: codes are strong, one use each, and wrong guesses are limited', async () => {
  const code = (await as('alice', 'select public.create_invite() as c')).rows[0].c;
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  const preview = (await as('bob', 'select * from public.preview_invite($1)', [code])).rows[0];
  assert.deepEqual(preview, { household_name: 'Our place', member_count: 1 });
  assert.equal((await as('bob', `select public.join_household($1, 'Bob') as h`, [code])).rows[0].h, aliceHouse);
  // Bob again (a lost answer, retried) is fine; Carol with the same code is not.
  assert.equal((await as('bob', `select public.join_household($1, 'Bob') as h`, [code])).rows[0].h, aliceHouse);
  assert.equal((await as('carol', `select public.join_household($1, 'Carol') as h`, [code])).rows[0].h, null);
  for (let i = 0; i < 9; i++) await as('carol', `select public.join_household('WRONG${i}', 'Carol')`);
  await fails(as('carol', `select public.join_household('WRONGX', 'Carol')`), /too-many-attempts/);
  await fails(as('carol', `select * from public.preview_invite('WRONGY')`), /too-many-attempts/);
});

test('SEC-08: codes can be cancelled, and a household keeps at most 5', async () => {
  for (let i = 0; i < 7; i++) await as('alice', 'select public.create_invite()');
  const live = await db.query('select count(*)::int as n from public.household_invites where household_id = $1 and used_at is null', [
    aliceHouse,
  ]);
  assert.equal(live.rows[0].n, 5);
  await as('bob', 'select public.revoke_invites()');
  const after = await db.query('select count(*)::int as n from public.household_invites where household_id = $1 and used_at is null', [
    aliceHouse,
  ]);
  assert.equal(after.rows[0].n, 0);
});

test('SEC-15: a member can remove another, but not someone in another household', async () => {
  await fails(as('alice', 'select public.remove_member($1)', [users.mallory]), /not-a-member/);
  await as('alice', 'select public.remove_member($1)', [users.bob]);
  assert.equal((await db.query('select count(*)::int as n from public.household_members where user_id = $1', [users.bob])).rows[0].n, 0);
});

test('SEC-13: deleting an account takes your shared recipes and your id out of a household that carries on', async () => {
  const code = (await as('alice', 'select public.create_invite() as c')).rows[0].c;
  await as('bob', `select public.join_household($1, 'Bob')`, [code]);
  const good = { id: 'b1', draft: { title: 'Bob pie', ingredientsText: '1 egg', methodText: 'Bake.', mealTypes: ['dinner'] } };
  const insert = `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by) values ($1, $2, $3, $4, $5, $6)`;
  await as('bob', insert, [aliceHouse, 'recipe', 'b1', good, now(), users.bob]);
  await as('bob', insert, [aliceHouse, 'tick', '2026-10-05|milk', { amount: '=' }, now(), users.bob]);
  await as('bob', 'select public.delete_account()');
  const rows = (
    await db.query(`select kind, deleted, updated_by from public.household_rows where key in ('b1', '2026-10-05|milk') order by kind`)
  ).rows;
  assert.deepEqual(rows, [
    { kind: 'recipe', deleted: true, updated_by: '00000000-0000-0000-0000-000000000000' },
    { kind: 'tick', deleted: false, updated_by: '00000000-0000-0000-0000-000000000000' },
  ]);
  assert.equal((await db.query('select count(*)::int as n from auth.users where id = $1', [users.bob])).rows[0].n, 0);
});

test('SEC-14: stale anonymous users outside a household are deleted; members and accounts are not', async () => {
  const stale = '66666666-6666-6666-6666-666666666666';
  await db.query(`insert into auth.users (id, is_anonymous, created_at) values ($1, true, now() - interval '40 days')`, [stale]);
  await db.query(`update auth.users set created_at = now() - interval '40 days' where id in ($1, $2)`, [users.mallory, users.carol]);
  await db.query('select public.delete_stale_anonymous_users()');
  const left = (await db.query('select id from auth.users where id in ($1, $2, $3)', [stale, users.mallory, users.carol])).rows.map(
    (r) => r.id,
  );
  assert.deepEqual(left.sort(), [users.mallory, users.carol].sort());
});

test('SEC-07: a household past its row ceiling is refused as a check violation', async () => {
  // Filled with triggers off (replica mode), or the fill itself takes minutes.
  await db.exec('set session_replication_role = replica');
  await db.query(
    `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by)
    select $1, 'cupboard', 'k' || g, '{}', 1, $2 from generate_series(1, 50000) g`,
    [malloryHouse, users.mallory],
  );
  await db.exec('set session_replication_role = origin');
  await fails(
    as(
      'mallory',
      `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by) values ($1, 'cupboard', 'one-more', '{}', 1, $2)`,
      [malloryHouse, users.mallory],
    ),
    (e) => e.code === '23514',
  );
});

test('SEC-06: the member list is no longer published to Realtime', async () => {
  const tables = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows.map(
    (r) => r.tablename,
  );
  assert.deepEqual(tables, ['account_rows', 'household_rows']);
});
