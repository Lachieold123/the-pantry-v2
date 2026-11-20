// The sync's server side on a throwaway Postgres (PGlite), never the live
// project (./harness.mjs: how to run it): the server's "received at" stamp and
// the pull that reads from it (K-36), and live rows on private Broadcast
// topics only members can join (K-32).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { as, db, fails, now, users } from './harness.mjs';

const aliceHouse = (await as('alice', `select public.create_household('Alice') as id`)).rows[0].id;
const malloryHouse = (await as('mallory', `select public.create_household('Mallory') as id`)).rows[0].id;

const upsertShared = `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by, received_at)
  values ($1, 'cupboard', $2, '{}', $3, $4, $5)
  on conflict (household_id, kind, key) do update set data = excluded.data, updated_at = excluded.updated_at,
    updated_by = excluded.updated_by, received_at = excluded.received_at`;
const receivedAt = async (key) =>
  Number((await db.query('select received_at from public.household_rows where key = $1', [key])).rows[0].received_at);

/** Reads a scope the way the app does: pages of `limit` from a whole position, until a short page. */
async function pullAll(user, fn, owner, after = 0, limit = 1000) {
  const out = [];
  let at = { after, kind: '', key: '' };
  for (;;) {
    const page = (await as(user, `select * from public.${fn}($1, $2, $3, $4, $5)`, [owner, at.after, at.kind, at.key, limit])).rows;
    out.push(...page);
    if (page.length < limit) return out;
    const last = page[page.length - 1];
    at = { after: Number(last.received_at), kind: last.kind, key: last.key };
  }
}

/** Whether Realtime would let `user` join the private topic: its policy on realtime.messages, read as that user. */
async function hears(user, topic) {
  const claims = JSON.stringify({ sub: users[user], is_anonymous: user === 'anon' || user === 'mallory' });
  return db.transaction(async (tx) => {
    await tx.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true), set_config('realtime.topic', $3, true)`,
      [users[user], claims, topic],
    );
    await tx.exec('set local role authenticated');
    const r = await tx.query(`select count(*)::int as n from realtime.messages where topic = $1`, [topic]);
    return r.rows[0].n > 0;
  });
}

test('K-36: the server stamps when it received a row, whatever the phone sends', async () => {
  const before = now();
  await as('alice', upsertShared, [aliceHouse, 'salt', now(), users.alice, 1]);
  const first = await receivedAt('salt');
  assert.ok(first >= before && first <= now(), 'an insert is stamped with the server clock');
  await as('alice', upsertShared, [aliceHouse, 'salt', now() + 10, users.alice, 9_000_000_000_000]);
  const second = await receivedAt('salt');
  assert.ok(second >= first && second <= now(), 'an update is stamped again, never in the future');
});

test('K-36: a write the newest-wins rule refuses leaves the stamp alone', async () => {
  await as('alice', upsertShared, [aliceHouse, 'pepper', now(), users.alice, 0]);
  const stamped = await receivedAt('pepper');
  await as('alice', upsertShared, [aliceHouse, 'pepper', 1, users.alice, 0]);
  assert.equal(await receivedAt('pepper'), stamped);
});

test('K-36: the pull answers only rows received after the mark', async () => {
  await as('alice', upsertShared, [aliceHouse, 'oil', now(), users.alice, 0]);
  await as('alice', upsertShared, [aliceHouse, 'flour', now(), users.alice, 0]);
  // Stamps pinned apart (triggers off), so the test doesn't depend on the clock moving between writes.
  await db.exec('set session_replication_role = replica');
  await db.query(`update public.household_rows set received_at = case key when 'flour' then 200 else 100 end`);
  await db.exec('set session_replication_role = origin');
  const after = await pullAll('alice', 'household_rows_since', aliceHouse, 150);
  assert.deepEqual(
    after.map((r) => r.key),
    ['flour'],
  );
  assert.deepEqual(Object.keys(after[0]).sort(), ['data', 'deleted', 'key', 'kind', 'received_at', 'updated_at', 'updated_by']);
  const everything = await pullAll('alice', 'household_rows_since', aliceHouse);
  assert.deepEqual(everything.map((r) => r.key).sort(), ['flour', 'oil', 'pepper', 'salt']);
});

test('K-36: pages never skip or repeat a row, even when many share a millisecond', async () => {
  await db.exec('set session_replication_role = replica');
  await db.query(
    `insert into public.household_rows (household_id, kind, key, data, updated_at, updated_by, received_at)
    select $1, 'tick', 'w|' || g, '{}', 1, $2, 42 from generate_series(1, 7) g`,
    [aliceHouse, users.alice],
  );
  await db.exec('set session_replication_role = origin');
  const paged = await pullAll('alice', 'household_rows_since', aliceHouse, 0, 2);
  const keys = paged.map((r) => `${r.kind}|${r.key}`);
  assert.equal(new Set(keys).size, keys.length, 'no repeats');
  const total = (await db.query('select count(*)::int as n from public.household_rows where household_id = $1', [aliceHouse])).rows[0].n;
  assert.equal(keys.length, total, 'no skips');
});

test("K-36: the pull shows only the caller's own scope", async () => {
  assert.equal((await pullAll('mallory', 'household_rows_since', aliceHouse)).length, 0);
  const own = `insert into public.account_rows (user_id, kind, key, data, updated_at, updated_by) values ($1, 'hidden', 'pho', '{}', $2, 'p')`;
  await as('carol', own, [users.carol, now()]);
  assert.deepEqual(
    (await pullAll('carol', 'account_rows_since', users.carol)).map((r) => r.key),
    ['pho'],
  );
  assert.equal((await pullAll('alice', 'account_rows_since', users.carol)).length, 0);
});

test('K-32: a write is broadcast to its private topic, without the owner column', async () => {
  await as('alice', upsertShared, [aliceHouse, 'rice', now(), users.alice, 0]);
  const sent = (
    await db.query(`select event, private, extension, payload from realtime.messages where topic = $1 and payload ->> 'key' = 'rice'`, [
      `household:${aliceHouse}`,
    ])
  ).rows;
  assert.equal(sent.length, 1);
  assert.equal(sent[0].event, 'row');
  assert.equal(sent[0].private, true);
  assert.equal(sent[0].extension, 'broadcast');
  assert.equal(sent[0].payload.kind, 'cupboard');
  assert.equal(sent[0].payload.received_at, await receivedAt('rice'));
  assert.equal('household_id' in sent[0].payload, false);
  const accountSent = await db.query(`select 1 from realtime.messages where topic = $1`, [`account:${users.carol}`]);
  assert.equal(accountSent.rows.length, 1);
});

test('K-32: members join their household topic; nobody else does', async () => {
  // Mallory's household needs a message to read, so it has one row too.
  await as('mallory', upsertShared, [malloryHouse, 'egg', now(), users.mallory, 0]);
  assert.equal(await hears('alice', `household:${aliceHouse}`), true);
  assert.equal(await hears('mallory', `household:${aliceHouse}`), false);
  assert.equal(await hears('carol', `household:${aliceHouse}`), false);
  assert.equal(await hears('mallory', `household:${malloryHouse}`), true);
  assert.equal(await hears('alice', 'household:not-a-uuid'), false);
});

test('K-32: a permanent user joins only their own account topic', async () => {
  assert.equal(await hears('carol', `account:${users.carol}`), true);
  assert.equal(await hears('alice', `account:${users.carol}`), false);
  // The quiet anonymous user behind a household has no account to hear.
  await db.query(`insert into realtime.messages (topic, extension, payload, event, private) values ($1, 'broadcast', '{}', 'row', true)`, [
    `account:${users.anon}`,
  ]);
  assert.equal(await hears('anon', `account:${users.anon}`), false);
});

test('K-32: a phone cannot send on a private topic, so it cannot fake a row', async () => {
  const fake = `insert into realtime.messages (topic, extension, payload, event, private) values ($1, 'broadcast', '{}', 'row', true)`;
  await fails(as('alice', fake, [`household:${aliceHouse}`]), /row-level security/);
});

test('K-32: deleting an account broadcasts nothing about the rows it removes', async () => {
  const before = (await db.query(`select count(*)::int as n from realtime.messages where topic = $1`, [`account:${users.carol}`])).rows[0]
    .n;
  await as('carol', 'select public.delete_account()');
  assert.equal((await db.query('select count(*)::int as n from public.account_rows where user_id = $1', [users.carol])).rows[0].n, 0);
  const after = (await db.query(`select count(*)::int as n from realtime.messages where topic = $1`, [`account:${users.carol}`])).rows[0].n;
  assert.equal(after, before);
});
