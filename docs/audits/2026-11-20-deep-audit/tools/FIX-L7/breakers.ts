// breakers.ts <group> id,id,... : the counted lines in each recipe whose link carries the group, plus the recipe's diets.
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const defs: any[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const groups = new Map(defs.map((d) => [d.id, d.groups as string[]]));
const g = process.argv[2]!;
// "@file" reads ids from a log: every "✗ <id>:" or "✗ <id> (" at a line start.
const arg = process.argv[3]!;
const list = arg.startsWith('@')
  ? [...new Set([...readFileSync(arg.slice(1), 'utf8').matchAll(/✗ ([a-z0-9-]+)[: ]/g)].map((m) => m[1]!))]
  : arg.split(',');
for (const id of list) {
  const r = recipes.find((x) => x.id === id);
  if (!r) { console.log('MISSING ' + id); continue; }
  const b = allLines(r).filter((l) => !l.optional && l.ingredientId && groups.get(l.ingredientId)?.includes(g));
  console.log(`${id} [${r.diets}]: ${b.map((l) => `${l.raw} -> ${l.ingredientId}`).join(' || ')}`);
}
