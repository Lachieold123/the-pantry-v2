// peek.ts <slug,slug> [lineRegex] : diets, provenance, route, and matching lines (or all lines).
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, routeOf } from './load.ts';
const [slugs, re, steps] = process.argv.slice(2);
const rx = re && re !== '-' ? new RegExp(re, 'i') : undefined;
for (const s of slugs!.split(',')) {
  const r = recipes.find((x) => x.id === s);
  if (!r) { console.log(s, 'NOT FOUND'); continue; }
  console.log(`## ${r.id} [${r.provenance}] diets=${r.diets.join(',')} serves=${r.servings} t=${r.prepMinutes}+${r.cookMinutes} ${routeOf(r.id)}`);
  for (const l of allLines(r)) if (!rx || rx.test(l.raw)) console.log(`   - ${l.raw} => ${l.ingredientId}${l.optional ? ' (opt)' : ''}`);
  if (steps) for (const t of [...r.steps.map((x) => x.text), ...(r.notes ?? []).map((n) => 'NOTE: ' + n)]) if (!rx || rx.test(t)) console.log(`   > ${t.slice(0, 300)}`);
}
