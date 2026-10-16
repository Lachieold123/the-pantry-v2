// Finds duplicate recipes in the batch-04 files (batch-04*.json), across files and
// against what already exists (the catalogue, the other house batches, parked
// batch-03 and the 12 Oct pilot), and with --write drops the extras from the
// batch-04 files. Batch-04 recipes are unpublished drafts; nothing outside these
// files is touched.
//
//   npx tsx scripts/dedupe-batch04.mts                  report only
//   ... --write                                         drop the duplicates from the batch-04 files
//   ... --report docs/DEDUPE-BATCH04.md                 write the markdown report
//
// A pair is a duplicate when any of these hold:
//   slug      same id once lower-cased and stripped to letters and digits
//   title     same title, normalised the same way
//   near-title  title words (stop words out, plurals folded) overlap 80%+ (Jaccard)
//   near-ingredients  same cuisine, both 6+ linked ingredients, ingredient sets overlap
//                     90%+ and the titles share at least one word
// The two near rules skip pairs where one is vegetarian and the other isn't (a meat-free
// version is its own recipe) and pairs listed in NOT_DUPLICATES (checked by hand).
// Against existing recipes the batch-04 one is always dropped. Inside batch-04 the
// most detailed version is kept (ingredient lines, steps, words in the method,
// notes, nutrition); ties keep the earlier file.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, normaliseWords, type IngredientDef } from '../src/domain/ingredients/database.ts';
import type { Recipe } from '../src/domain/recipes/types.ts';
import { batchFiles, readBatch, toRecipe, type HouseRecipe } from './house-recipes.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
const STOP = new Set(['with', 'and', 'the', 'a', 'an', 'of', 'in', 'on', 'style', 'easy', 'quick', 'simple', 'my', 'house']);
const titleWords = (t: string) => new Set(normaliseWords(t).filter((w) => !STOP.has(w)));
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};
const isVeg = (diets?: readonly string[]) => (diets ? diets.includes('vegetarian') || diets.includes('vegan') : undefined);

// Same ingredients, different dish: looked at by hand on 17 Oct 2026.
const NOT_DUPLICATES = new Set(
  [
    ['crisp-rosemary-grissini', 'rosemary-sea-salt-focaccia'],
    ['oyakodon-quick-rice-bowl', 'sukiyaki-don-beef-rice-bowl'],
    ['fijian-kokoda-fish-in-coconut-and-lime', 'samoan-style-oka-cooked-fish-salad-with-coconut'],
    ['sage-cornbread-dressing', 'gluten-free-cornbread-stuffing-muffins'],
    ['layered-lamb-and-bulgur-kibbeh-tray', 'baked-lamb-kibbeh-bites'],
    ['chicken-souvlaki-pita-wraps-with-tzatziki', 'greek-chicken-gyro-pitas-with-red-onion'],
  ].map((p) => p.sort().join('|')),
);
const shares = (a: Set<string>, b: Set<string>) => [...a].some((x) => b.has(x));

type Entry = {
  key: string; // unique within this run
  id: string;
  title: string;
  from: string;
  slug: string;
  nt: string;
  words: Set<string>;
  ids?: Set<string> | undefined;
  cuisine?: string | undefined;
  veg?: boolean | undefined;
  detail: number;
  batch04: boolean;
};

const houseIds = (h: HouseRecipe): Set<string> | undefined => {
  try {
    const r = toRecipe(h, root, index, () => {});
    return new Set(r.ingredientGroups.flatMap((g) => g.items.flatMap((l) => (l.ingredientId ? [l.ingredientId] : []))));
  } catch {
    return undefined;
  }
};
const detailOf = (h: HouseRecipe) =>
  h.ingredients.reduce((n, g) => n + g.items.length, 0) * 2 +
  h.steps.length * 3 +
  h.steps.join(' ').split(/\s+/).length / 25 +
  (h.notes?.length ?? 0) * 2 +
  h.summary.length / 100 +
  (h.nutrition ? 1 : 0);
const entry = (id: string, title: string, from: string, batch04: boolean, extra: Partial<Entry> = {}): Entry => ({
  key: `${from}#${id}`,
  id,
  title,
  from,
  slug: norm(id),
  nt: norm(title),
  words: titleWords(title),
  detail: 0,
  batch04,
  ...extra,
});

// ---------- batch-04 drafts ----------

const files = batchFiles(root).filter((f) => basename(f).startsWith('batch-04'));
const batches = new Map(files.map((f) => [f, readBatch(f)]));
const drafts: Entry[] = [];
for (const [f, b] of batches)
  b.recipes.forEach((h, i) =>
    drafts.push(
      entry(h.id, h.title, basename(f), true, {
        key: `${basename(f)}#${i}`,
        ids: houseIds(h),
        cuisine: h.cuisine,
        veg: isVeg(h.diets),
        detail: detailOf(h),
      }),
    ),
  );

// ---------- what already exists ----------

const existing: Entry[] = [];
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as Recipe[];
const draftIds = new Set(drafts.map((d) => d.id));
for (const r of catalogue) {
  if (draftIds.has(r.id)) continue; // a batch-04 recipe already converted into the catalogue on this branch
  const ids = new Set(r.ingredientGroups.flatMap((g) => g.items.flatMap((l) => (l.ingredientId ? [l.ingredientId] : []))));
  existing.push(entry(r.id, r.title, 'catalogue', false, { ids, cuisine: r.cuisine, veg: isVeg(r.diets) }));
}
for (const f of batchFiles(root).filter((x) => !basename(x).startsWith('batch-04')))
  for (const h of readBatch(f).recipes)
    existing.push(entry(h.id, h.title, basename(f), false, { ids: houseIds(h), cuisine: h.cuisine, veg: isVeg(h.diets) }));
try {
  const b3 = JSON.parse(
    execFileSync('git', ['show', 'house-recipes-batch-03:scripts/data/house-recipes/batch-03.json'], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    }).toString(),
  ) as { recipes: HouseRecipe[] };
  for (const h of b3.recipes)
    existing.push(entry(h.id, h.title, 'batch-03 (parked)', false, { ids: houseIds(h), cuisine: h.cuisine, veg: isVeg(h.diets) }));
} catch {
  console.warn('(batch-03 branch not found: skipped)');
}
const PILOT = join(process.env.HOME ?? '', 'Desktop/HQ/11-ThePantryV2/recipe-pilot-2026-10-12/recipes.json');
if (existsSync(PILOT))
  for (const r of JSON.parse(readFileSync(PILOT, 'utf8')) as { id: string; title: string }[])
    existing.push(entry(r.id, r.title, 'pilot 12 Oct', false));

// ---------- matching ----------

function match(a: Entry, b: Entry): string | undefined {
  if (a.slug === b.slug) return 'slug';
  if (a.nt === b.nt) return 'title';
  if (NOT_DUPLICATES.has([a.id, b.id].sort().join('|'))) return undefined;
  if (a.veg !== undefined && b.veg !== undefined && a.veg !== b.veg) return undefined;
  const tj = jaccard(a.words, b.words);
  if (a.words.size >= 2 && b.words.size >= 2 && tj >= 0.8) return `near-title ${tj.toFixed(2)}`;
  if (a.ids && b.ids && a.cuisine && a.cuisine === b.cuisine && a.ids.size >= 6 && b.ids.size >= 6 && shares(a.words, b.words)) {
    const ij = jaccard(a.ids, b.ids);
    if (ij >= 0.9) return `near-ingredients ${ij.toFixed(2)}`;
  }
  return undefined;
}

type Drop = { e: Entry; keptAs: Entry; reason: string };
const drops = new Map<string, Drop>();

// 1. Against existing: the draft goes.
for (const d of drafts)
  for (const x of existing) {
    const why = match(d, x);
    if (why) {
      drops.set(d.key, { e: d, keptAs: x, reason: `${why} (existing)` });
      break;
    }
  }

// 2. Inside batch-04: most detailed first; a recipe is dropped only when it directly
//    matches one already kept (no chains, so a hand-checked pair can't be joined through a third).
const live = drafts
  .filter((d) => !drops.has(d.key))
  .map((d, i) => ({ d, i }))
  .sort((a, b) => b.d.detail - a.d.detail || a.i - b.i) // ties keep the earlier file
  .map((x) => x.d);
const kept: Entry[] = [];
for (const d of live) {
  let hit: Drop | undefined;
  for (const k of kept) {
    const w = match(d, k);
    if (w) {
      hit = { e: d, keptAs: k, reason: w };
      break;
    }
  }
  if (hit) drops.set(d.key, hit);
  else kept.push(d);
}

// ---------- write ----------

if (write)
  for (const [f, b] of batches) {
    const before = b.recipes.length;
    b.recipes = b.recipes.filter((_, i) => !drops.has(`${basename(f)}#${i}`));
    if (b.recipes.length === before) continue;
    const indent = /\n( +)"/.exec(readFileSync(f, 'utf8'))?.[1]?.length ?? 1;
    writeFileSync(f, `${JSON.stringify(b, null, indent)}\n`);
  }

// ---------- report ----------

const list = [...drops.values()].sort((a, b) => a.e.from.localeCompare(b.e.from) || a.e.title.localeCompare(b.e.title));
const vsExisting = list.filter((d) => !d.keptAs.batch04).length;
const kinds = new Map<string, number>();
for (const d of list) {
  const k = d.reason.split(' ')[0] ?? '';
  kinds.set(k, (kinds.get(k) ?? 0) + 1);
}
const summary = `${drafts.length} batch-04 recipes in ${files.length} files; ${list.length} duplicates (${vsExisting} of existing recipes, ${list.length - vsExisting} inside batch-04); ${drafts.length - list.length} unique left`;
console.log(summary);
console.log(`by rule: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')}${write ? '' : '  (report only: add --write to drop them)'}`);

// The report keeps every run that dropped something (newest first), so re-running after
// the slices gain commits adds to the record instead of wiping it.
if (reportPath) {
  const path = isAbsolute(reportPath) ? reportPath : join(root, reportPath);
  const old = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const history = old.includes('\n## Run ') ? old.slice(old.indexOf('\n## Run ') + 1) : '';
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Australia/Sydney' }).slice(0, 16);
  const section =
    list.length || !history
      ? [
          `## Run ${stamp}${write ? '' : ' (report only, nothing dropped)'}`,
          '',
          `- ${summary}.`,
          `- By rule: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}.`,
          '',
          '| Dropped (file) | Title | Kept (file) | Kept title | Rule |',
          '| --- | --- | --- | --- | --- |',
          ...list.map(
            (d) =>
              `| ${d.e.id} (${d.e.from.replace('.json', '')}) | ${d.e.title} | ${d.keptAs.id} (${d.keptAs.from.replace('.json', '')}) | ${d.keptAs.title === d.e.title ? '(same title)' : d.keptAs.title} | ${d.reason} |`,
          ),
          '',
        ].join('\n')
      : '';
  const prevDropped = [...history.matchAll(/; (\d+) duplicates \(/g)].reduce((n, m) => n + Number(m[1]), 0);
  const md = [
    '# Batch-04 dedupe',
    '',
    `Made by \`scripts/dedupe-batch04.mts\` on branch house-recipes-batch-04-merge (re-run by \`scripts/merge-batch04.sh\`).`,
    '',
    `- Now: ${drafts.length - (write ? list.length : 0)} unique batch-04 recipes. Dropped so far: ${prevDropped + (write ? list.length : 0)}. Last run ${stamp}.`,
    '- Rules: same slug, same title, title words 80%+ alike, or same cuisine with 90%+ of 6+ linked ingredients shared and a title word in common. The near rules skip vegetarian vs non-vegetarian pairs and a short hand-checked list (NOT_DUPLICATES in the script).',
    '- Existing means the catalogue (src/data/catalogue/recipes.json), batch-01/02, parked batch-03 and the 12 Oct pilot. Against those the batch-04 draft is always dropped.',
    '- Inside batch-04 the more detailed version is kept (ingredient lines, steps, method length, notes, nutrition).',
    '- Only the batch-04 draft files on this branch change. Nothing published is removed.',
    '',
    section,
    history,
  ];
  writeFileSync(path, `${md.join('\n').trimEnd()}\n`);
}
