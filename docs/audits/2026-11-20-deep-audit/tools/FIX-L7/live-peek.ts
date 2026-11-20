// live-peek.ts <slug-regex> : the 17 Oct published_recipes backup: row count, keys, and for matching slugs id | diets | lines with " or ".
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const rows: any[] = JSON.parse(readFileSync(ROOT + 'docs/backups/supabase-2026-10-17/published_recipes.json', 'utf8'));
console.log('rows', rows.length, 'keys', Object.keys(rows[0]).join(','), 'status', [...new Set(rows.map((r) => r.status))]);
const re = new RegExp(process.argv[2] ?? '^$');
for (const r of rows.filter((x) => re.test(x.slug))) {
  const lines = (r.recipe.ingredientGroups ?? []).flatMap((g: any) => g.items).map((l: any) => `${l.raw}${l.optional ? ' (opt)' : ''}`);
  console.log(r.id, r.slug, r.diets, r.recipe.diets, '|', (process.argv[3] ? lines : lines.filter((l: string) => / or /.test(l))).join(' ; ').slice(0, 600));
}
const upd: any[] = JSON.parse(readFileSync(ROOT + 'docs/backups/feed-payloads-2026-10-17/feed-updates.json', 'utf8'));
const ins: any[] = JSON.parse(readFileSync(ROOT + 'docs/backups/feed-payloads-2026-10-17/feed-inserts.json', 'utf8'));
const u = new Set(upd.map((x) => x.id));
console.log('updates', upd.length, 'inserts', ins.length, 'backup rows not in updates', rows.filter((x) => !u.has(x.id)).map((x) => x.slug).join(' ').slice(0, 400));
