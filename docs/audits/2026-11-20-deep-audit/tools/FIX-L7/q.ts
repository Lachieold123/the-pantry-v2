// q.ts "phrase|phrase" [idsubstr,..] : what index.match gives each phrase, and defs whose id contains a substring.
import { readFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const defs: IngredientDef[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const index = buildIngredientIndex(defs);
const [phrases, ids] = process.argv.slice(2);
for (const p of (phrases ?? '').split('|').filter(Boolean)) {
  const id = index.match(p);
  console.log(`"${p}" -> ${id} [${index.byId.get(id ?? '')?.groups.join(',') ?? ''}]`);
}
for (const s of (ids ?? '').split(',').filter(Boolean))
  for (const d of defs.filter((d) => d.id.includes(s)))
    console.log(`  ${d.id} "${d.name}" [${d.groups.join(',')}] aliases: ${d.aliases.join('; ').slice(0, 300)}`);
