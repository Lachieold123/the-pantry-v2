// L2: ingredient lines whose item/prep text carries a second amount that scaling never touches ("3 egg yolks + 1 whole egg").
import fs from 'node:fs';
import { shipsInStoreBuilds } from '../../../../../src/domain/recipes/provenance';

type Line = { item: string; raw: string; quantity?: unknown; prep?: string };
type R = { id: string; provenance?: unknown; ingredientGroups: { items: Line[] }[] };
const all = JSON.parse(fs.readFileSync('src/data/catalogue/recipes.json', 'utf8')) as R[];
const NUM = /(\+|\band\b|,)\s*(\d+(?:[.,/]\d+)?|[½¼¾⅓⅔])\s*(g|kg|ml|l|tbsp|tsp|cups?|whole|large|small|medium|egg|cloves?|[a-z]+)/i;
let n = 0; const recipes = new Set<string>(); let store = 0; const eg: string[] = [];
for (const r of all) for (const g of r.ingredientGroups) for (const l of g.items) {
  if (l.quantity === undefined) continue;
  const rest = `${l.item} ${l.prep ?? ''}`;
  if (/\+\s*\d/.test(rest) || /\band\s+\d+\s*(g|ml|tbsp|tsp|cups?|whole|egg)/i.test(rest)) {
    n++; recipes.add(r.id); if (shipsInStoreBuilds(r.provenance as never)) store++;
    if (eg.length < 12) eg.push(`${r.id}: ${l.raw}`);
  }
}
void NUM;
console.log(`lines with an unscaled second amount: ${n} in ${recipes.size} recipes (${store} lines in store-build recipes)`);
console.log(eg.join('\n'));
