// ids.ts <regex> : ingredient defs whose id matches, with groups and how many catalogue lines link to each.
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const defs: any[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const uses = new Map<string, number>();
for (const r of recipes) for (const l of allLines(r)) if (l.ingredientId) uses.set(l.ingredientId, (uses.get(l.ingredientId) ?? 0) + 1);
const rx = new RegExp(process.argv[2]!, 'i');
for (const d of defs) if (rx.test(d.id)) console.log(`${d.id} [${d.groups}] x${uses.get(d.id) ?? 0}`);
