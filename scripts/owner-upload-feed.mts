/**
 * Owner-run feed upload (17 Oct 2026 payloads). Run it yourself in Terminal:
 *
 *   npx tsx scripts/owner-upload-feed.mts            # prompts for the service-role key (hidden)
 *   npx tsx scripts/owner-upload-feed.mts --dry-run  # checks the payloads, no network
 *
 * - Project URL comes from src/lib/backend.ts. The key is read from a hidden prompt (or the
 *   SUPABASE_SERVICE_ROLE_KEY env var), kept in memory only, never printed or written anywhere.
 * - Updates: each row in feed-compact-updates.json is merged into recipe (same as the MCP chunks:
 *   recipe || changed fields, notes replaced, blank "Food safety:" stubs dropped), diets column
 *   set when the row has diets. Content and tag changes go in one update per row. Rows that
 *   already match are skipped, so re-running (or overlapping with the MCP helper) is harmless.
 * - Inserts: feed-inserts.json, skipped when the slug already exists in the feed, then
 *   upsert with ignoreDuplicates on (cook_id, slug). Never deletes anything.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const payloadDir = join(root, 'docs/backups/feed-payloads-2026-10-17');
const localBackupDir = join(root, 'docs/backups/supabase-2026-10-17');
const BACKUP_TABLES = ['published_recipes_20261017', 'ingredient_extras_20261017', 'cooks_20261017'];
const dryRun = process.argv.includes('--dry-run');

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type UpdateRow = { id: string; notes?: string[]; steps?: Json[]; diets?: string[] } & Record<string, Json>;
type InsertRow = {
  slug: string;
  title: string;
  cuisine: string;
  meal_types: string[];
  diets: string[];
  difficulty: string;
  total_minutes: number;
  recipe: Record<string, Json>;
};

let secret = '';
const scrub = (s: string) => (secret ? s.split(secret).join('[key hidden]') : s);
const log = (...a: unknown[]) => console.log(scrub(a.map(String).join(' ')));
const errMsg = (e: unknown) =>
  scrub(e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e));

const isStub = (n: unknown) => typeof n === 'string' && n.trim() === 'Food safety:';
const cleanNotes = (notes: Json[]) => notes.filter((n) => !isStub(n));

// ---------- payload validation (no network) ----------
function validate(updates: UpdateRow[], inserts: InsertRow[]): string[] {
  const problems: string[] = [];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const strArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  const allowed = new Set(['id', 'notes', 'steps', 'diets']);
  const ids = new Set<string>();
  updates.forEach((r, i) => {
    const at = `update #${i + 1} (${r.id})`;
    if (!uuid.test(String(r.id))) problems.push(`${at}: bad id`);
    if (ids.has(r.id)) problems.push(`${at}: duplicate id`);
    ids.add(r.id);
    for (const k of Object.keys(r)) if (!allowed.has(k)) problems.push(`${at}: unexpected field ${k}`);
    if (Object.keys(r).length < 2) problems.push(`${at}: no changed fields`);
    if (r.notes !== undefined && !strArr(r.notes)) problems.push(`${at}: notes not a string list`);
    if (r.diets !== undefined && !strArr(r.diets)) problems.push(`${at}: diets not a string list`);
    if (r.steps !== undefined && (!Array.isArray(r.steps) || r.steps.length === 0)) problems.push(`${at}: steps empty`);
  });
  const slugs = new Set<string>();
  inserts.forEach((r, i) => {
    const at = `insert #${i + 1} (${r.slug})`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug) || r.slug.length > 90) problems.push(`${at}: bad slug`);
    if (slugs.has(r.slug)) problems.push(`${at}: duplicate slug`);
    slugs.add(r.slug);
    if (!r.title || r.title.length > 80) problems.push(`${at}: title length`);
    if (!/^[a-z-]{2,30}$/.test(r.cuisine)) problems.push(`${at}: bad cuisine`);
    if (!strArr(r.meal_types) || r.meal_types.length < 1 || r.meal_types.length > 4) problems.push(`${at}: meal_types`);
    if (!strArr(r.diets)) problems.push(`${at}: diets`);
    if (!['easy', 'medium', 'hard'].includes(r.difficulty)) problems.push(`${at}: difficulty`);
    if (!Number.isInteger(r.total_minutes) || r.total_minutes < 1 || r.total_minutes > 4320) problems.push(`${at}: total_minutes`);
    if (!r.recipe || typeof r.recipe !== 'object') problems.push(`${at}: recipe missing`);
    else if (Buffer.byteLength(JSON.stringify(r.recipe)) > 60000) problems.push(`${at}: recipe too big`);
  });
  return problems;
}

// ---------- helpers ----------
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canon((v as Record<string, unknown>)[k])]),
    );
  return v;
}
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

function mergeRecipe(current: Record<string, Json>, row: UpdateRow): Record<string, Json> {
  const { id: _id, notes, ...rest } = row;
  const merged: Record<string, Json> = { ...current, ...rest };
  if (notes !== undefined) merged.notes = cleanNotes(notes);
  return merged;
}

async function readHidden(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) throw new Error('No terminal for the hidden prompt. Run this in Terminal.');
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let buf = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const done = (fn: () => void) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      fn();
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done(() => resolve(buf.trim()));
        if (ch === '\u0003') return done(() => reject(new Error('Cancelled.')));
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else if (ch >= ' ') buf += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function publishedCount(db: SupabaseClient): Promise<number> {
  const { count, error } = await db.from('published_recipes').select('id', { count: 'exact', head: true }).eq('status', 'published');
  if (error) throw new Error(`published count: ${errMsg(error)}`);
  return count ?? 0;
}

async function selectAll<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw new Error(errMsg(error));
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function checkBackups(db: SupabaseClient): Promise<void> {
  let schemaHidden = false;
  for (const t of BACKUP_TABLES) {
    const { count, error } = await db.schema('backup').from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      log(`  backup.${t}: ${count} rows`);
      if (!count) throw new Error(`backup.${t} is empty. Stopping.`);
      continue;
    }
    const code = (error as { code?: string }).code ?? '';
    const msg = errMsg(error);
    if (code === 'PGRST106' || /schema/i.test(msg)) {
      schemaHidden = true; // the API does not expose the backup schema; fall back below
      break;
    }
    throw new Error(`backup.${t} not found (${code} ${msg}). Stopping before any write.`);
  }
  if (schemaHidden) {
    log('  The API cannot see the "backup" schema (normal: it is not exposed), so checking the local export instead.');
    const files = ['published_recipes.json', 'cooks.json', 'ingredient_extras.json'];
    for (const f of files) {
      const p = join(localBackupDir, f);
      if (!existsSync(p)) throw new Error(`Local backup ${p} missing. Stopping before any write.`);
      const rows = JSON.parse(readFileSync(p, 'utf8')) as unknown[];
      if (!Array.isArray(rows) || rows.length === 0) throw new Error(`Local backup ${f} is empty. Stopping.`);
      log(`  local ${f}: ${rows.length} rows`);
    }
    log('  (In-database copies backup.*_20261017 were confirmed by Claude on 17 Oct: 604 / 241 / 100.)');
  }
}

// ---------- main ----------
async function main() {
  const updates = JSON.parse(readFileSync(join(payloadDir, 'feed-compact-updates.json'), 'utf8')) as UpdateRow[];
  const inserts = JSON.parse(readFileSync(join(payloadDir, 'feed-inserts.json'), 'utf8')) as InsertRow[];
  const problems = validate(updates, inserts);
  const by = (k: string) => updates.filter((r) => k in r).length;
  const stubs =
    updates.reduce((n, r) => n + (r.notes ?? []).filter(isStub).length, 0) +
    inserts.reduce((n, r) => n + ((r.recipe.notes as Json[] | undefined) ?? []).filter(isStub).length, 0);
  log(`Payloads: ${updates.length} updates (notes ${by('notes')}, steps ${by('steps')}, diets ${by('diets')}), ${inserts.length} inserts.`);
  if (stubs) log(`Blank "Food safety:" notes that will be dropped: ${stubs}`);
  if (problems.length) {
    log(`Payload problems (${problems.length}):`);
    problems.slice(0, 50).forEach((p) => log('  ' + p));
    process.exit(1);
  }
  log('Payloads valid.');

  const url = /SUPABASE_URL\s*=\s*'([^']+)'/.exec(readFileSync(join(root, 'src/lib/backend.ts'), 'utf8'))?.[1];
  if (!url) throw new Error('Could not read SUPABASE_URL from src/lib/backend.ts');

  if (dryRun) {
    log(`\nDRY RUN (no connection). Would connect to ${url} and:`);
    log('  1. Check the backup tables exist, abort if not.');
    log('  2. Print the published count.');
    log(`  3. Update up to ${updates.length} rows by id (rows already matching are skipped).`);
    log(`  4. Insert up to ${inserts.length} new recipes (slugs already in the feed are skipped).`);
    log('  5. Print the published count again and the totals. Nothing is deleted.');
    return;
  }

  secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    (await readHidden('Paste the service_role key, then press Enter (it will not show): '));
  if (secret.length < 20) throw new Error('That key looks too short. Nothing was changed.');
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  log(`\nConnecting to ${url}`);
  log('Checking backups...');
  await checkBackups(db);
  const before = await publishedCount(db);
  log(`Published before: ${before}`);

  // ---- updates ----
  let updated = 0,
    upSkipped = 0;
  const errors: string[] = [];
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    const { data, error } = await db
      .from('published_recipes')
      .select('id, recipe, diets')
      .in(
        'id',
        batch.map((r) => r.id),
      );
    if (error) {
      batch.forEach((r) => errors.push(`update ${r.id}: read failed: ${errMsg(error)}`));
      continue;
    }
    const current = new Map((data ?? []).map((d) => [d.id as string, d as { recipe: Record<string, Json>; diets: string[] }]));
    for (const row of batch) {
      const cur = current.get(row.id);
      if (!cur) {
        errors.push(`update ${row.id}: row not found`);
        continue;
      }
      const recipe = mergeRecipe(cur.recipe, row);
      const diets = row.diets ?? cur.diets;
      if (same(recipe, cur.recipe) && same(diets, cur.diets)) {
        upSkipped++;
        continue;
      }
      const { data: res, error: e } = await db
        .from('published_recipes')
        .update(row.diets ? { recipe, diets } : { recipe })
        .eq('id', row.id)
        .select('id');
      if (e || !res?.length) errors.push(`update ${row.id}: ${e ? errMsg(e) : 'no row updated'}`);
      else updated++;
    }
    log(`  updates: ${Math.min(i + 50, updates.length)}/${updates.length} checked (${updated} updated, ${upSkipped} already done)`);
  }

  // ---- inserts ----
  let inserted = 0,
    inSkipped = 0;
  const existing = new Set<string>();
  for (let i = 0; i < inserts.length; i += 50) {
    const { data, error } = await db
      .from('published_recipes')
      .select('slug')
      .in(
        'slug',
        inserts.slice(i, i + 50).map((r) => r.slug),
      );
    if (error) throw new Error(`slug check: ${errMsg(error)}`);
    (data ?? []).forEach((d) => existing.add(d.slug as string));
  }
  const todo = inserts.filter((r) => !existing.has(r.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
  inSkipped = inserts.length - todo.length;
  if (todo.length) {
    const cooks = await selectAll<{ id: string; handle: string; recipe_count: number }>((f, t) =>
      db.from('cooks').select('id, handle, recipe_count').eq('kind', 'person').range(f, t),
    );
    const { data: off, error: offErr } = await db.from('cooks').select('id').eq('kind', 'official').limit(1);
    if (offErr || !off?.length) throw new Error(`official cook lookup failed: ${offErr ? errMsg(offErr) : 'none found'}`);
    const officialId = off[0].id as string;
    const pubs = await selectAll<{ cook_id: string; cuisine: string }>((f, t) =>
      db.from('published_recipes').select('cook_id, cuisine').eq('status', 'published').range(f, t),
    );
    // Same rule as the MCP chunks: rotate through person cooks already publishing that cuisine,
    // fewest recipes first; otherwise the official cook.
    const byId = new Map(cooks.map((c) => [c.id, c]));
    const cands = new Map<string, { id: string; handle: string; recipe_count: number }[]>();
    for (const p of pubs) {
      const c = byId.get(p.cook_id);
      if (!c) continue;
      const list = cands.get(p.cuisine) ?? [];
      if (!list.includes(c)) list.push(c);
      cands.set(p.cuisine, list);
    }
    for (const list of cands.values()) list.sort((a, b) => a.recipe_count - b.recipe_count || a.handle.localeCompare(b.handle));
    const seen = new Map<string, number>();
    for (const r of todo) {
      const n = seen.get(r.cuisine) ?? 0;
      seen.set(r.cuisine, n + 1);
      const list = cands.get(r.cuisine);
      const cookId = list?.length ? list[n % list.length].id : officialId;
      const notes = r.recipe.notes as Json[] | undefined;
      const recipe = notes ? { ...r.recipe, notes: cleanNotes(notes) } : r.recipe;
      const { data, error } = await db
        .from('published_recipes')
        .upsert(
          {
            cook_id: cookId,
            slug: r.slug,
            title: r.title,
            cuisine: r.cuisine,
            meal_types: r.meal_types,
            diets: r.diets,
            difficulty: r.difficulty,
            total_minutes: r.total_minutes,
            recipe,
            review: 'auto-checked',
            status: 'published',
          },
          { onConflict: 'cook_id,slug', ignoreDuplicates: true },
        )
        .select('id');
      if (error) errors.push(`insert ${r.slug}: ${errMsg(error)}`);
      else if (!data?.length) inSkipped++;
      else inserted++;
    }
  }
  log(`  inserts: ${inserted} inserted, ${inSkipped} already in the feed`);

  const after = await publishedCount(db);
  log('\n==== Result ====');
  log(`Published before: ${before}   after: ${after}`);
  log(`Updated: ${updated}   already up to date (skipped): ${upSkipped}`);
  log(`Inserted: ${inserted}   already there (skipped): ${inSkipped}`);
  log(`Errors: ${errors.length}`);
  errors.forEach((e) => log('  ' + e));
  log(errors.length ? '\nFinished with errors (listed above). Safe to run again.' : '\nAll done. Nothing was deleted.');
  process.exitCode = errors.length ? 2 : 0;
}

main().catch((e) => {
  console.error(scrub('\nStopped: ' + errMsg(e)));
  process.exit(1);
});
