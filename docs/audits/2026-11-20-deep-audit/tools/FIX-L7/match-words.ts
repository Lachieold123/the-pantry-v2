// match-words.ts <word> ... : which ingredient each word matches and its groups, plus catalogue lines that use it.
import { readFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const index = buildIngredientIndex(JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8')) as IngredientDef[]);
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
for (const w of process.argv.slice(2)) {
  const id = index.match(w);
  const uses = recipes.flatMap((r) => allLines(r).filter((l) => new RegExp(`\\b${w}`, 'i').test(l.raw)).map((l) => `${r.id}: ${l.raw} -> ${l.ingredientId ?? '-'} [${(l.ingredientId && index.byId.get(l.ingredientId)?.groups.join(',')) || ''}]`));
  console.log(`${w} -> ${id ?? '-'} [${(id && index.byId.get(id)?.groups.join(',')) || ''}] uses ${uses.length}`);
  for (const u of uses.slice(0, 6)) console.log('   ', u.slice(0, 160));
}
