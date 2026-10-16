import { readFileSync } from 'node:fs';
import { buildIngredientIndex } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
const defs = JSON.parse(readFileSync('src/data/ingredients/ingredients.json','utf8'));
const index = buildIngredientIndex(defs);
for (const w of readFileSync(0,'utf8').split('\n').filter(Boolean)) {
  const {line,issues}=parseIngredientLine('100g '+w,index.match);
  console.log(w.padEnd(24), issues.includes('no-ingredient-match')?'-- NO':line.ingredientId);
}
