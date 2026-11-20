// payload-vegan.ts [--write] : FOOD-9. Makes the 17 Oct feed payloads agree with the 24 Oct live fixes
// (telegram-bot/scratch/pantry-nas-2026-10-24.md A1): vegan off 11 rows, no-dairy off 6, vegetarian off 2.
// Edits the top-level diets and recipe.diets in every payload file, keyed by id. Then run gen_chunks.py.
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = new URL('../../../../backups/feed-payloads-2026-10-17/', import.meta.url).pathname;
const write = process.argv.includes('--write');
// [title, tags to drop, the line that proves it]
const ROWS: [string, string[], string][] = [
  // Live kept vegetarian here, but Parmesan is made with animal rennet (D-053), so the payload drops it too and FIX-L7-LIVE.sql fixes the live row.
  ['Pasta e Lenticchie', ['vegan', 'no-dairy', 'vegetarian'], 'Parmesan'],
  ['Pasta e Fagioli', ['vegan', 'no-dairy'], 'parmesan rind'],
  ['Briam', ['vegan', 'no-dairy'], 'feta'],
  ['Chakalaka and Pap', ['vegan', 'no-dairy'], 'butter'],
  ['Mujadara', ['vegan', 'no-dairy'], 'Greek yoghurt'],
  ['Roti and Dal', ['vegan', 'no-dairy'], 'butter/ghee'],
  ['Dal with Crispy Onions', ['vegan', 'vegetarian'], 'chicken stock option'],
  ['Githeri', ['vegan', 'vegetarian'], 'chicken stock option'],
  ['Ful Medames', ['vegan'], 'egg'],
  ['Buri Gochu Jjim', ['vegan'], 'honey'],
  ['Rotkohl mit Apfeln', ['vegan'], 'honey'],
];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
type Row = { id?: string; slug?: string; title?: string; diets?: string[]; recipe?: { id?: string; title?: string; diets?: string[] } };
const files = ['feed-updates.json', 'feed-compact-updates.json', 'feed-inserts.json'];
const data = Object.fromEntries(files.map((f) => [f, JSON.parse(readFileSync(DIR + f, 'utf8')) as Row[]]));
const keyOf = (r: Row) => r.id ?? r.slug ?? r.recipe?.id;
// Titles live in the full rows; compact rows carry only the id.
const drop = new Map<string, string[]>();
for (const [title, tags] of ROWS) {
  const hits = Object.values(data).flat().filter((r) => norm(r.title ?? r.recipe?.title ?? '') === norm(title));
  if (!hits.length) console.log('NOT FOUND', title);
  for (const h of hits) drop.set(keyOf(h)!, tags);
}
let changed = 0;
for (const f of files) {
  for (const r of data[f]!) {
    const tags = drop.get(keyOf(r) ?? '');
    if (!tags) continue;
    for (const holder of [r, r.recipe]) {
      if (!holder?.diets) continue;
      const before = holder.diets.join(',');
      holder.diets = holder.diets.filter((d) => !tags.includes(d));
      if (holder.diets.join(',') !== before) (changed++, console.log(f, keyOf(r), r.title ?? r.recipe?.title ?? '', before, '->', holder.diets.join(',')));
    }
  }
  if (write) writeFileSync(DIR + f, JSON.stringify(data[f]) + (readFileSync(DIR + f, 'utf8').endsWith('\n') ? '\n' : ''));
}
console.log(changed, 'diet lists changed', write ? '(written)' : '(dry run)');
