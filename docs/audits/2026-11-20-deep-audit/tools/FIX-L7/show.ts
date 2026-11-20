// show.ts id,id,... : every line (raw -> link [groups]), diets, notes and step text for the given recipes.
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const ing: any = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const list: any[] = Array.isArray(ing) ? ing : ing.ingredients ?? Object.values(ing);
const groups = new Map(list.map((i: any) => [i.id, i.groups ?? i.allergens ?? []]));
const steps = process.argv.includes('--steps');
for (const id of process.argv[2]!.split(',')) {
  const r: any = recipes.find((x) => x.id === id);
  if (!r) { console.log('MISSING ' + id); continue; }
  console.log(`== ${id} [${r.provenance}] diets=${r.diets} title=${r.title}`);
  for (const l of allLines(r)) console.log(`  ${l.raw} -> ${l.ingredientId ?? '-'} [${groups.get(l.ingredientId ?? '') ?? ''}]`);
  for (const n of r.notes ?? []) console.log('  NOTE ' + (typeof n === 'string' ? n : JSON.stringify(n)));
  if (steps) for (const s of r.steps ?? []) console.log('  STEP ' + (typeof s === 'string' ? s : s.text ?? JSON.stringify(s)).slice(0, 300));
}
