// live-sql-check.mjs : FOOD-16 self-check of FIX-L7-LIVE.sql on a throwaway PGlite (supabase/tests/harness.mjs), never live.
// Loads the 17 Oct cooks + published_recipes backup, runs the file, checks it changed rows, that a second run changes
// nothing, that diets and recipe->diets agree, and that the undo comments put every row back.
// Run: PGLITE=/tmp/pg/node_modules/@electric-sql/pglite/dist/index.js node docs/audits/2026-11-20-deep-audit/tools/FIX-L7/live-sql-check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db } from '../../../../../supabase/tests/harness.mjs';

const ROOT = new URL('../../../../../', import.meta.url).pathname;
const B = ROOT + 'docs/backups/supabase-2026-10-17/';
const sql = readFileSync(ROOT + 'docs/audits/2026-11-20-deep-audit/FIX-L7-LIVE.sql', 'utf8').split('\n');
const run = sql.filter((l) => l.startsWith('update '));
const undo = sql.filter((l) => l.startsWith('-- undo: ')).map((l) => l.slice(9));

const cooks = JSON.parse(readFileSync(B + 'cooks.json', 'utf8'));
const cookCols = (await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='cooks'`)).rows.map((r) => r.column_name);
// The backup's users are not here; skip foreign keys and triggers for the load only.
await db.exec(`set session_replication_role = replica`);
for (const c of cooks) {
  const cols = Object.keys(c).filter((k) => cookCols.includes(k));
  await db.query(`insert into public.cooks (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) on conflict do nothing`, cols.map((k) => c[k]));
}
const rows = JSON.parse(readFileSync(B + 'published_recipes.json', 'utf8'));
for (const r of rows) {
  const cols = Object.keys(r);
  await db.query(`insert into public.published_recipes (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`, cols.map((k) => r[k]));
}
await db.exec(`set session_replication_role = origin`);
const snap = async () => (await db.query(`select id, (select array_agg(x order by x) from unnest(diets) x) diets, (select jsonb_agg(x order by x) from jsonb_array_elements_text(recipe->'diets') x) rd, recipe->'notes' n from public.published_recipes order by id`)).rows.map((r) => JSON.stringify(r));
const before = await snap();
let changed = 0;
for (const s of run) changed += (await db.query(s)).affectedRows ?? 0;
const after = await snap();
let again = 0;
for (const s of run) again += (await db.query(s)).affectedRows ?? 0;
const mismatch = (await db.query(`select slug from public.published_recipes where (select coalesce(jsonb_agg(x order by x), '[]') from unnest(diets) x) <> (select coalesce(jsonb_agg(x order by x), '[]') from jsonb_array_elements_text(recipe->'diets') x)`)).rows;
const undone = [];
for (const s of undo) await db.query(s);
const back = await snap();
for (let i = 0; i < before.length; i++) if (before[i] !== back[i]) undone.push(before[i].slice(0, 60));
console.log({ statements: run.length, undos: undo.length, rowsLoaded: rows.length, changed, secondRun: again, diffRows: after.filter((a, i) => a !== before[i]).length, dietsMismatch: mismatch.length, notRestored: undone.length });
assert.equal(run.length, undo.length, 'every statement has an undo');
assert.ok(changed > 0);
assert.equal(again, 0, 'a second run changes nothing');
assert.equal(mismatch.length, 0, 'diets and recipe->diets agree');
assert.equal(undone.length, 0, 'the undos restore every row');
