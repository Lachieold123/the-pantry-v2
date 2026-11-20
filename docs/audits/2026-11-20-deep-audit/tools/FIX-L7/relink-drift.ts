// relink-drift.ts : for converted recipes, how many lines would change link if re-matched (item) or re-parsed (raw), and diet changes.
import { readFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../../../../../src/domain/ingredients/parse.ts';
import { deriveDiets } from '../../../../../src/domain/recipes/diets.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const defs: IngredientDef[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const index = buildIngredientIndex(defs);
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const tags = JSON.parse(readFileSync(ROOT + 'scripts/data/recipe-tags.json', 'utf8'));
let m = 0, p = 0, pItem = 0, d = 0, t = 0, n = 0;
for (const r of recipes) {
  if (!tags[r.id]) continue;
  n++;
  if (tags[r.id].title !== r.title || tags[r.id].summary !== r.summary) { t++; if (t < 4) console.log('tag drift', r.id); }
  for (const l of allLines(r)) {
    if (index.match(l.item) !== l.ingredientId) { m++; if (m < 6) console.log('match', l.item, l.ingredientId, '->', index.match(l.item)); }
    const f = parseIngredientLine(l.raw, index.match).line;
    if (f.ingredientId !== l.ingredientId) p++;
    if (f.item !== l.item || f.quantity !== l.quantity || f.unit !== l.unit) pItem++;
  }
  const nd = deriveDiets(allLines(r), index.byId);
  if (nd.join() !== r.diets.join()) { d++; if (d < 6) console.log('diet', r.id, r.diets.join(), '->', nd.join()); }
}
console.log({ converted: n, matchDiff: m, parseLinkDiff: p, parseShapeDiff: pItem, dietDiff: d, tagDrift: t });
