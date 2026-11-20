// count.ts : recipes by source and provenance, and the total.
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: any[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const by: Record<string, number> = {};
for (const r of recipes) by[`${r.source}/${r.provenance}`] = (by[`${r.source}/${r.provenance}`] ?? 0) + 1;
console.log(recipes.length, by, Object.keys(recipes[0]).join(','));
