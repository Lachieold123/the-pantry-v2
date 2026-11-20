// gf-risk.ts : no-gluten recipes whose lines link to an ingredient id matching the regex (label-dependent gluten), with counts per id.
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const rx = new RegExp(process.argv[2] ?? 'stock|broth|bouillon', 'i');
const by = new Map<string, string[]>();
for (const r of recipes) {
  if (!r.diets.includes('no-gluten')) continue;
  for (const l of allLines(r)) if (!l.optional && l.ingredientId && rx.test(l.ingredientId)) by.set(l.ingredientId, [...(by.get(l.ingredientId) ?? []), r.id]);
}
for (const [k, v] of [...by].sort((a, b) => b[1].length - a[1].length)) console.log(`${k} x${v.length}: ${v.slice(0, 4).join(', ')}`);
