/**
 * Offline check of the 17 Oct 2026 feed payloads and their generated SQL chunks (no network, ever).
 *
 *   npm run feed:verify                              # payload and chunk checks, prints md5 of steps per id
 *   npm run feed:verify -- live-rows.json [more...]  # also diff against an export of the live rows
 *
 * The live export is JSON (array) or NDJSON, rows shaped { id, slug, steps } or { id, slug, recipe }.
 * See docs/FEED-VERIFY.md for the read-only SQL that produces it. Exit code 1 on any problem.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = Record<string, Json>;
export type UpdateRow = { id: string; notes?: string[]; steps?: Json; diets?: string[]; recipe?: Obj } & Obj;
export type InsertRow = { slug: string; diets: string[]; recipe: Obj } & Obj;
export type LiveRow = { id?: string; slug?: string; steps?: Json; recipe?: Json };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = join(root, 'docs/backups/feed-payloads-2026-10-17');

function canon(v: Json): Json {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canon(v[k] as Json)]),
    );
  return v;
}
const canonText = (v: unknown) => JSON.stringify(canon(v as Json));
/** md5 of the canonical (sorted-key, compact) JSON, so Postgres jsonb key order and spacing cannot matter. */
export const stepsMd5 = (steps: unknown) => createHash('md5').update(canonText(steps ?? null)).digest('hex');

export const isStub = (n: unknown) => typeof n === 'string' && n.trim() === 'Food safety:';
const FORBIDDEN_VEG = ['parmesan', 'parmigiano', 'pecorino', 'gelatin', 'gelatine'];
const FORBIDDEN_VEGAN = ['honey'];

/** Dairy/animal ingredients that contradict a vegetarian or vegan tag, from the ingredient lines only. */
export function dietConflicts(diets: string[], recipe: Obj | undefined): string[] {
  const vegan = diets.includes('vegan');
  if (!vegan && !diets.includes('vegetarian')) return [];
  const text = JSON.stringify(recipe?.ingredientGroups ?? []).toLowerCase();
  const words = vegan ? [...FORBIDDEN_VEG, ...FORBIDDEN_VEGAN] : FORBIDDEN_VEG;
  return words.filter((w) => new RegExp(`\\b${w}\\b`).test(text));
}

/** Pull the JSON array out of a chunk's first $q$...$q$ block. */
export function chunkRows(sql: string): Obj[] {
  const parts = sql.split('$q$');
  if (parts.length < 3) throw new Error('no $q$ block');
  return JSON.parse(parts[1] as string) as Obj[];
}

export type Inputs = {
  full: UpdateRow[];
  compact: UpdateRow[];
  inserts: InsertRow[];
  chunks: Record<string, Obj[]>; // name -> rows, e.g. u01, s03, i07, x01
};
export type Report = { problems: string[]; notes: string[]; expected: Map<string, string> };

const prefixOf = (n: string) => n.slice(0, 1);

export function check(inp: Inputs, expectUpdates = 565, expectInserts = 127): Report {
  const problems: string[] = [];
  const notes: string[] = [];
  const expected = new Map<string, string>(); // "id:<uuid>" or "slug:<slug>" -> md5

  if (inp.full.length !== expectUpdates) problems.push(`full updates: ${inp.full.length}, expected ${expectUpdates}`);
  if (inp.inserts.length !== expectInserts) problems.push(`inserts: ${inp.inserts.length}, expected ${expectInserts}`);

  // Which chunks are the live write path: u01..u03 were applied first, s01.. cover the rest (u04+ are the same rows).
  const names = Object.keys(inp.chunks).sort();
  const uAll = names.filter((n) => prefixOf(n) === 'u');
  const applied = names.filter((n) => ['u01', 'u02', 'u03'].includes(n) || prefixOf(n) === 's');
  const iAll = names.filter((n) => prefixOf(n) === 'i');

  const count = (set: string[], key: 'id' | 'slug') => {
    const m = new Map<string, string[]>();
    for (const n of set) for (const r of inp.chunks[n] ?? []) m.set(String(r[key]), [...(m.get(String(r[key])) ?? []), n]);
    return m;
  };
  const sameRow = (a: Obj | undefined, b: Obj) => !!a && canonText(a) === canonText(b);
  const coverage = (label: string, rows: Obj[], key: 'id' | 'slug', set: string[]) => {
    const seen = count(set, key);
    for (const r of rows) {
      const where = seen.get(String(r[key])) ?? [];
      if (where.length !== 1) problems.push(`${label} ${r[key]}: in ${where.length} chunks (${where.join(',') || 'none'}), expected 1`);
      else {
        const inChunk = inp.chunks[where[0] as string]?.find((c) => c[key] === r[key]);
        if (!sameRow(inChunk, r)) problems.push(`${label} ${r[key]}: chunk ${where[0]} differs from the payload row`);
      }
    }
    const known = new Set(rows.map((r) => String(r[key])));
    for (const id of seen.keys()) if (!known.has(id)) problems.push(`${label} ${id}: in a chunk but not in the payload`);
  };
  coverage('update (applied chunks u01-u03 + s*)', inp.compact, 'id', applied);
  coverage('update (chunks u01-u17)', inp.compact, 'id', uAll);
  coverage('insert', inp.inserts as Obj[], 'slug', iAll);

  const fullById = new Map(inp.full.map((r) => [r.id, r]));
  const ids = new Set<string>();
  for (const r of inp.compact) {
    if (ids.has(r.id)) problems.push(`compact update ${r.id}: duplicate id`);
    ids.add(r.id);
    if (!fullById.has(r.id)) problems.push(`compact update ${r.id}: not in feed-updates.json`);
  }
  const unchanged = inp.full.filter((r) => !ids.has(r.id));
  if (unchanged.length)
    notes.push(`${unchanged.length} of ${inp.full.length} full-update rows have no compact entry (no field changes, so no chunk).`);

  // Food-safety stubs, in payloads and chunk text alike.
  const stubIn = (label: string, notesList: unknown) => {
    if (Array.isArray(notesList) && notesList.some(isStub)) problems.push(`${label}: blank "Food safety:" note`);
  };
  for (const r of inp.full) stubIn(`full update ${r.id}`, r.recipe?.notes);
  for (const r of inp.compact) stubIn(`compact update ${r.id}`, r.notes);
  for (const r of inp.inserts) stubIn(`insert ${r.slug}`, r.recipe.notes);
  for (const [n, rows] of Object.entries(inp.chunks))
    for (const r of rows) stubIn(`chunk ${n} ${String(r.id ?? r.slug ?? '')}`, r.notes ?? (r.recipe as Obj | undefined)?.notes);

  // Diet tags against ingredients (full rows carry the ingredient lines; compact diets win when present).
  for (const r of inp.full) {
    const diets = inp.compact.find((c) => c.id === r.id)?.diets ?? r.diets ?? [];
    const bad = dietConflicts(diets, r.recipe);
    if (bad.length) problems.push(`update ${r.id} (${String(r.title)}): tagged ${diets.join('/')} but has ${bad.join(', ')}`);
  }
  for (const r of inp.inserts) {
    const bad = dietConflicts(r.diets, r.recipe);
    if (bad.length) problems.push(`insert ${r.slug}: tagged ${r.diets.join('/')} but has ${bad.join(', ')}`);
  }

  // Expected live steps: the compact steps when the row changes them, else the full row's recipe steps.
  for (const r of inp.full) {
    const compact = inp.compact.find((c) => c.id === r.id);
    expected.set(`id:${r.id}`, stepsMd5(compact?.steps ?? r.recipe?.steps));
  }
  for (const r of inp.inserts) expected.set(`slug:${r.slug}`, stepsMd5(r.recipe.steps));
  return { problems, notes, expected };
}

export function parseLive(text: string): LiveRow[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[')) return JSON.parse(t) as LiveRow[];
  return t.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as LiveRow);
}

const liveSteps = (r: LiveRow): Json => {
  const recipe = typeof r.recipe === 'string' ? (JSON.parse(r.recipe) as Obj) : (r.recipe as Obj | null | undefined);
  return (r.steps ?? recipe?.steps ?? null) as Json;
};

export type Diff = { missing: string[]; extra: string[]; mismatched: string[]; matched: number };

/** Updates are keyed by id (live ids exist already); inserts by slug (live ids are generated on insert). */
export function diffLive(expected: Map<string, string>, live: LiveRow[]): Diff {
  const seen = new Map<string, string>();
  for (const r of live) {
    const md5 = stepsMd5(liveSteps(r));
    if (r.id && expected.has(`id:${r.id}`)) seen.set(`id:${r.id}`, md5);
    else if (r.slug && expected.has(`slug:${r.slug}`)) seen.set(`slug:${r.slug}`, md5);
    else seen.set(r.id ? `id:${r.id}` : `slug:${r.slug}`, md5);
  }
  const d: Diff = { missing: [], extra: [], mismatched: [], matched: 0 };
  for (const [k, md5] of expected) {
    const got = seen.get(k);
    if (got === undefined) d.missing.push(k);
    else if (got !== md5) d.mismatched.push(`${k} expected ${md5} live ${got}`);
    else d.matched++;
  }
  for (const k of seen.keys()) if (!expected.has(k)) d.extra.push(k);
  return d;
}

export function load(dir: string): Inputs {
  const j = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const chunks: Record<string, Obj[]> = {};
  for (const f of readdirSync(join(dir, 'chunks')).filter((x) => x.endsWith('.sql')))
    chunks[f.replace(/\.sql$/, '')] = chunkRows(readFileSync(join(dir, 'chunks', f), 'utf8'));
  return { full: j('feed-updates.json'), compact: j('feed-compact-updates.json'), inserts: j('feed-inserts.json'), chunks };
}

/** The read-only export query for exactly the rows this payload touches (SELECT only). */
export function exportSql(inp: Inputs, from: number, to: number): string {
  const ids = inp.full.map((r) => `'${r.id}'`).slice(from, to);
  const slugs = from === 0 ? inp.inserts.map((r) => `'${r.slug}'`) : [];
  return (
    `select id, slug, recipe->'steps' as steps from public.published_recipes ` +
    `where id in (${ids.join(',') || "''"})` +
    (slugs.length ? ` or slug in (${slugs.join(',')})` : '') +
    ' order by id;'
  );
}

function main() {
  const args = process.argv.slice(2);
  const liveFiles = args.filter((a) => !a.startsWith('--'));
  const inp = load(DEFAULT_DIR);
  if (args.includes('--sql')) {
    // Pages of 150 ids keep each result small enough to paste or save; page 1 also carries the insert slugs.
    for (let from = 0, n = 1; from < inp.full.length; from += 150, n++) console.log(`-- page ${n}\n${exportSql(inp, from, from + 150)}\n`);
    return;
  }
  const { problems, notes, expected } = check(inp);
  console.log(`Payloads: ${inp.full.length} full updates, ${inp.compact.length} compact updates, ${inp.inserts.length} inserts.`);
  console.log(`Chunks: ${Object.keys(inp.chunks).length} files.`);
  notes.forEach((n) => console.log('Note: ' + n));
  console.log(`\nmd5 of recipe->steps (canonical JSON), ${expected.size} rows:`);
  for (const [k, md5] of expected) console.log(`${md5}  ${k}`);
  let failed = problems.length > 0;
  console.log(problems.length ? `\nPayload problems (${problems.length}):` : '\nPayload checks: all passed.');
  problems.slice(0, 100).forEach((p) => console.log('  ' + p));

  if (liveFiles.length) {
    const live: LiveRow[] = [];
    for (const f of liveFiles) {
      if (!existsSync(f)) throw new Error(`live export not found: ${f}`);
      live.push(...parseLive(readFileSync(f, 'utf8')));
    }
    const d = diffLive(expected, live);
    console.log(`\nLive diff (${live.length} live rows): ${d.matched} match, ${d.mismatched.length} mismatched, ${d.missing.length} missing, ${d.extra.length} extra.`);
    for (const [label, list] of [['MISMATCHED', d.mismatched], ['MISSING', d.missing], ['EXTRA', d.extra]] as const)
      list.slice(0, 100).forEach((x) => console.log(`  ${label} ${x}`));
    if (d.mismatched.length || d.missing.length || d.extra.length) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
