// diet-diff.ts [ref] : recipes whose diets differ from the catalogue at git ref (default HEAD~0 committed copy), and any tag ADDED.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const ref = process.argv[2] ?? '8cba2a8';
const now = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8')) as any[];
const was = new Map((JSON.parse(execSync(`git -C ${ROOT} show ${ref}:src/data/catalogue/recipes.json`, { maxBuffer: 1e9 }).toString()) as any[]).map((r) => [r.id, r]));
let removed = 0, added = 0;
const out: string[] = [];
for (const r of now) {
  const o = was.get(r.id);
  if (!o) { out.push(`new ${r.id}`); continue; }
  const lost = o.diets.filter((d: string) => !r.diets.includes(d));
  const got = r.diets.filter((d: string) => !o.diets.includes(d));
  if (lost.length) removed++;
  if (got.length) added++;
  if (lost.length || got.length) out.push(`${r.id}${o.provenance === 'reviewed' ? ' [reviewed]' : ''}: -[${lost}] +[${got}]`);
}
for (const id of was.keys()) if (!now.some((r) => r.id === id)) out.push(`gone ${id}`);
console.log(out.join('\n'));
console.log({ total: now.length, recipesLosingATag: removed, recipesGainingATag: added });
