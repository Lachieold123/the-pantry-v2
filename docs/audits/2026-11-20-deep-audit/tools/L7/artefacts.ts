// Find-and-replace damage: "<food>-free" / "-style" words that are not real diet words, in titles, slugs, lines, steps.
import { writeFileSync } from 'node:fs';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, routeOf, EV, csv } from './load.ts';
const OK = /^(gluten|dairy|egg|nut|sugar|fat|soy|lactose|meat|wheat|grain|oil|alcohol|caffeine|peanut|sesame|shellfish|fish|hands|cruelty|salt|bpa|stress|mess|fuss|knead|bake|no-bake|carb|refined-sugar|seed|allergen|tree-nut|corn|oven|grease|lump|pressure|hands-free|stick|nightshade|yeast|guilt|ice|frost|chemical|preservative|msg|clump|vegan|animal|top8|onion|garlic)$/;
const rows: Record<string, string>[] = [];
for (const r of recipes) {
  const parts: [string, string][] = [['title', r.title], ['slug', r.id], ['summary', r.summary ?? ''], ...allLines(r).map((l) => ['line', l.raw] as [string, string]), ...r.steps.map((s) => ['step', s.text] as [string, string])];
  for (const [where, t] of parts) for (const m of t.toLowerCase().matchAll(/\b([a-z]+)-free\b/g)) if (!OK.test(m[1]!)) rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', where, word: m[0], text: t.slice(0, 140) });
}
const by: Record<string, number> = {};
for (const r of rows) by[r.where!] = (by[r.where!] ?? 0) + 1;
console.log('rows', rows.length, 'recipes', new Set(rows.map((r) => r.slug)).size, by, 'provenance', rows.reduce<Record<string, number>>((a, r) => ((a[r.provenance!] = (a[r.provenance!] ?? 0) + 1), a), {}));
const words: Record<string, number> = {};
for (const r of rows) words[r.word!] = (words[r.word!] ?? 0) + 1;
console.log(Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w, n]) => `${w} ${n}`).join(', '));
for (const r of rows.filter((x) => x.where === 'title').slice(0, 8)) console.log(' ', r.slug, '|', r.text);
writeFileSync(EV + 'find-replace-artefacts.csv', csv(rows));
