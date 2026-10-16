import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex } from '../src/domain/ingredients/database.ts';
import { toRecipe } from './house-recipes.mts';
const defs = JSON.parse(readFileSync('src/data/ingredients/ingredients.json','utf8'));
const index = buildIngredientIndex(defs);
const f = process.argv[2];
const b = JSON.parse(readFileSync(f,'utf8'));
for (const h of b.recipes) {
  const r = toRecipe(h, process.cwd(), index, () => {});
  h.diets = r.diets;
}
writeFileSync(f, JSON.stringify(b, null, 2));
