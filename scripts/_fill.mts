import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIngredientIndex } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
const root = process.cwd();
const defs = JSON.parse(readFileSync(join(root,'src/data/ingredients/ingredients.json'),'utf8'));
const index = buildIngredientIndex(defs);
const f = join(root,'scripts/data/house-recipes',process.argv[2]);
const b = JSON.parse(readFileSync(f,'utf8'));
for (const r of b.recipes) {
  const lines = r.ingredients.flatMap((g:any)=>g.items.map((s:string)=>{const {line,issues}=parseIngredientLine(s,index.match); if(issues.includes('no-ingredient-match')) console.log('NOMATCH',r.id,s); return line;}));
  r.diets = deriveDiets(lines,index.byId);
}
writeFileSync(f,JSON.stringify(b,null,1));
