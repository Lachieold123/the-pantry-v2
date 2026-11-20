// egg-hits.ts [keyword] : recipes with an egg line whose steps/notes hit RAW_EGG and have no vulnerable-people line; prints the hit with context.
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
import { NOT_RAW_EGG, RAW_EGG } from '../../../../../scripts/recipe-text-checks.mts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const only = process.argv[2];
const tally: Record<string, number> = {};
for (const r of recipes) {
  if (!allLines(r).some((l) => !l.optional && l.ingredientId === 'egg')) continue;
  const method = [...r.steps.map((s) => s.text), ...(r.notes ?? [])].join(' ');
  if (/pregnan|vulnerable|immun|pasteuri/i.test(method)) continue;
  const m = new RegExp(RAW_EGG.source, 'i').exec(method.replace(NOT_RAW_EGG, ' '));
  if (!m) continue;
  const k = m[0].toLowerCase();
  tally[k] = (tally[k] ?? 0) + 1;
  if (only && only !== 'all' && k !== only) continue;
  if (only === 'all' || only) console.log(`${r.id} | ${method.replace(NOT_RAW_EGG, ' ').slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ')}`);
}
console.log(JSON.stringify(tally));
