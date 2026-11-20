// split-lines.ts : FIX-LOGIC-DATA-TODO §1. Splits the compound lines that buy two things into one line each, so the
// shopping list counts both. Batch -> /tmp/l7-split-edits.json (edit-batch.ts), converted -> /tmp/l7-split-fixes.json.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Recipe } from '../../../../../src/domain/recipes/types.ts';
import { all } from './batch-io.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const inBatch = new Set([...all()].map(({ h }) => h.id as string));
const SPLITS: [string, string, string, string][] = [
  ['carbonara', '3 egg yolks + 1 whole egg', '3 egg yolks', '1 egg'],
  ['fish-tacos', '1 chipotle in adobo, chopped + 1 tsp adobo sauce', '1 chipotle in adobo, chopped', '1 tsp adobo sauce'],
  ['roast-chicken', '2 tbsp chopped thyme + 1 tbsp rosemary', '2 tbsp chopped thyme', '1 tbsp chopped rosemary'],
  ['soy-poached-chicken-with-ginger-spring-onion-oil', '6 spring onion, 3 sliced and 3 whole', '3 spring onions, sliced', '3 spring onions, whole'],
];
const edits: Record<string, unknown> = {};
const fixes: Record<string, unknown> = {};
for (const [id, from, a, b] of SPLITS) {
  const r = recipes.find((x) => x.id === id)!;
  const gi = r.ingredientGroups.findIndex((g) => g.items.some((l) => l.raw === from));
  if (gi < 0) { console.log('NOT FOUND', id, from); continue; }
  if (inBatch.has(id)) edits[id] = { replace: [{ in: 'items', from, to: a }], addItems: [{ group: gi, line: b }] };
  else fixes[id] = { ingredients: [{ from, to: a }], addIngredients: [{ group: gi ? r.ingredientGroups[gi]!.title ?? null : null, line: b }] };
  console.log(id, inBatch.has(id) ? 'batch' : 'converted', 'group', gi);
}
writeFileSync('/tmp/l7-split-edits.json', JSON.stringify(edits, null, 1));
writeFileSync('/tmp/l7-split-fixes.json', JSON.stringify(fixes, null, 1));
