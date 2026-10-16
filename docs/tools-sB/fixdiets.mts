import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex } from '/Users/lachlanoldfield/Developer/the-pantry-v2-b04-sB/src/domain/ingredients/database.ts';
import { parseIngredientLine } from '/Users/lachlanoldfield/Developer/the-pantry-v2-b04-sB/src/domain/ingredients/parse.ts';
import { deriveDiets } from '/Users/lachlanoldfield/Developer/the-pantry-v2-b04-sB/src/domain/recipes/diets.ts';
const defs = JSON.parse(readFileSync('/Users/lachlanoldfield/Developer/the-pantry-v2-b04-sB/src/data/ingredients/ingredients.json','utf8'));
const index = buildIngredientIndex(defs);
const f = process.argv[2];
const b = JSON.parse(readFileSync(f,'utf8'));
for (const r of b.recipes) {
  const items = r.ingredients.flatMap((g:any)=>g.items.map((raw:string)=>{const {line,issues}=parseIngredientLine(raw,index.match); if(issues.includes('no-ingredient-match')) console.log('NOMATCH',r.id,raw); return line;}));
  r.diets = deriveDiets(items, index.byId);
}
writeFileSync(f, JSON.stringify(b,null,2));
