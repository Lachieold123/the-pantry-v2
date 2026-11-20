// find.ts <regex> : catalogue recipes whose id or title matches: id | diets | title.
import { readFileSync } from 'node:fs';
import type { Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const re = new RegExp(process.argv[2]!, 'i');
for (const r of recipes) if (re.test(r.id) || re.test(r.title.normalize('NFD').replace(/[̀-ͯ]/g, ''))) console.log(`${r.id} | ${r.diets.join(',')} | ${r.title}`);
