// alias-lines.ts : the lane's smelly aliases (alias-smell.ts regex), with how many catalogue lines use each and one sample item.
import { readFileSync } from 'node:fs';
import { normaliseWords, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const defs: IngredientDef[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const SMELL = /\b(with|for|in|or|and|soaked|mixed|plus|free|style|to serve|from)\b|-free|-style/;
const has = (w: string[], p: string[]) => w.some((_, i) => p.every((x, j) => w[i + j] === x));
const lines = recipes.flatMap((r) => allLines(r).map((l) => ({ r: r.id, l })));
let n = 0;
for (const d of defs)
  for (const a of d.aliases) {
    if (!SMELL.test(a)) continue;
    const p = normaliseWords(a);
    const hits = lines.filter(({ l }) => l.ingredientId === d.id && has(normaliseWords(l.item), p));
    n++;
    console.log(`${d.id}[${d.groups.join(',')}] "${a}" x${hits.length}${hits[0] ? ' e.g. ' + hits[0].l.item : ''}`);
  }
console.log(n, 'aliases');
