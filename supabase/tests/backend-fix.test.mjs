// The 20 Nov 2026 backend fixes (docs/audits/2026-11-20-deep-audit/FIX-BACKEND.md),
// on a throwaway Postgres (./harness.mjs), never the live project.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { as, db, fails, users } from './harness.mjs';

/** Runs SQL as a bare role (anon with the public key, or the service role an edge function uses). */
const asRole = (role, sql, params = []) =>
  db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    return tx.query(sql, params);
  });

const cook = (
  await db.query(`insert into public.cooks (kind, handle, display_name) values ('house', 'test_kitchen', 'Test kitchen') returning id`)
).rows[0].id;
const other = (
  await db.query(`insert into public.cooks (kind, handle, display_name) values ('house', 'other_kitchen', 'Other') returning id`)
).rows[0].id;
const recipe = (
  await db.query(
    `insert into public.published_recipes (cook_id, slug, title, cuisine, meal_types, difficulty, total_minutes, recipe, review)
     values ($1, 'toast', 'Toast', 'british', '{breakfast}', 'easy', 5, '{}', 'vetted') returning id`,
    [cook],
  )
).rows[0].id;
await db.query('insert into public.follows (follower_id, followee_id) values ($1, $2)', [other, cook]);

test('S2-15: anon and signed-in users still read the feed', async () => {
  for (const read of [(sql) => asRole('anon', sql), (sql) => as('alice', sql)]) {
    assert.equal((await read('select count(*)::int n from public.published_recipes')).rows[0].n, 1);
    assert.equal((await read('select count(*)::int n from public.cooks')).rows[0].n, 2);
    assert.equal((await read('select count(*)::int n from public.follows')).rows[0].n, 1);
  }
});

test('S2-15: nobody but the service role writes the feed tables', async () => {
  for (const write of [(sql, p) => asRole('anon', sql, p), (sql, p) => as('alice', sql, p)]) {
    await fails(write('insert into public.follows (follower_id, followee_id) values ($1, $2)', [cook, other]), /permission denied/);
    await fails(write('delete from public.follows'), /permission denied/);
    await fails(write(`update public.cooks set display_name = 'x'`), /permission denied/);
    await fails(write('truncate public.published_recipes cascade'), /permission denied/);
    await fails(write(`insert into public.ingredient_extras (id, kind, name) values ('x', 'new', 'x')`), /permission denied/);
  }
  await asRole('service_role', `update public.cooks set bio = 'still works' where id = $1`, [cook]);
});

test('S2-15: households are made only through the functions', async () => {
  await fails(as('carol', `insert into public.households (name, created_by) values ('x', $1)`, [users.carol]), /permission denied/);
  const h = (await as('carol', `select public.create_household('Carol') as id`)).rows[0].id;
  assert.ok(h);
  await as('carol', 'select public.leave_household()');
});

test('S2-2: no direct inserts into home_events; reading your own still works', async () => {
  await fails(as('alice', `insert into public.home_events (type, recipe_id) values ('open', $1)`, [recipe]), /permission denied/);
  await fails(as('alice', 'delete from public.home_events'), /permission denied/);
  assert.equal((await as('alice', 'select count(*)::int n from public.home_events')).rows[0].n, 0);
  // The ranking functions are security definer and keep working.
  await as('alice', 'select * from public.home_candidates(10)');
});

test('S2-5: deleting an account deletes its home events and its Apple token', async () => {
  await db.query(`insert into public.home_events (viewer_id, type, recipe_id) values ($1, 'open', $2), ($3, 'open', $2)`, [
    users.bob,
    recipe,
    users.alice,
  ]);
  await asRole('service_role', 'select public.apple_token_save($1, $2)', [users.bob, 'r.bob']);
  await as('bob', 'select public.delete_account()');
  const left = await db.query('select viewer_id from public.home_events');
  assert.deepEqual(
    left.rows.map((r) => r.viewer_id),
    [users.alice],
  );
  assert.equal((await db.query('select count(*)::int n from private.apple_tokens where user_id = $1', [users.bob])).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int n from auth.users where id = $1', [users.bob])).rows[0].n, 0);
});

test('S2-4: only the service role keeps and reads Apple tokens', async () => {
  await asRole('service_role', 'select public.apple_token_save($1, $2)', [users.alice, 'r.one']);
  await asRole('service_role', 'select public.apple_token_save($1, $2)', [users.alice, 'r.two']);
  assert.equal((await asRole('service_role', 'select public.apple_token_take($1) t', [users.alice])).rows[0].t, 'r.two');
  assert.equal((await asRole('service_role', 'select public.apple_token_take($1) t', [users.carol])).rows[0].t, null);
  await fails(as('alice', 'select public.apple_token_take($1)', [users.alice]), /permission denied/);
  await fails(as('mallory', 'select public.apple_token_save($1, $2)', [users.alice, 'evil']), /permission denied/);
  await fails(asRole('anon', 'select public.apple_token_take($1)', [users.alice]), /permission denied/);
  await fails(as('alice', 'select * from private.apple_tokens'), /permission denied/);
});

test('S2-17: household policies call auth.uid() once per statement; the two foreign keys are indexed', async () => {
  const policies = await db.query(
    `select policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') as rule from pg_policies
     where policyname in ('members rename themselves', 'members add shared rows', 'members change shared rows')`,
  );
  assert.equal(policies.rows.length, 3);
  for (const p of policies.rows) assert.doesNotMatch(p.rule.replace(/\(\s*select auth\.uid\(\)( as uid)?\s*\)/gi, ''), /auth\.uid\(\)/i);
  const idx = await db.query(
    `select indexname from pg_indexes where indexname in ('household_invites_by_household', 'home_events_by_cook')`,
  );
  assert.equal(idx.rows.length, 2);
  // Renaming yourself still works under the reworded policy.
  const h = (await as('carol', `select public.create_household('Carol') as id`)).rows[0].id;
  await as('carol', `update public.household_members set display_name = 'Caz' where user_id = $1`, [users.carol]);
  assert.equal(
    (await db.query('select display_name from public.household_members where household_id = $1', [h])).rows[0].display_name,
    'Caz',
  );
});

test('S2-8: the backup tables get row level security where they exist, and nothing fails where they do not', async () => {
  const migration = readFileSync(new URL('../migrations/20261120000600_backup_rls.sql', import.meta.url), 'utf8');
  await db.exec('create schema backup; create table backup.cooks_20261017 (id uuid)');
  await db.exec(migration);
  const rls = await db.query(`select relrowsecurity from pg_class where oid = 'backup.cooks_20261017'::regclass`);
  assert.equal(rls.rows[0].relrowsecurity, true);
});
