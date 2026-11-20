// lines.ts <regex> [max] : catalogue lines whose item matches, grouped by linked id, with counts and sample (recipe:cuisine:raw).
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const max = Number(process.argv[3] ?? 3);
for (const pat of process.argv[2]!.split(';;')) {
console.log('== ' + pat);
const rx = new RegExp(pat, 'i');
const by = new Map<string, string[]>();
for (const r of recipes)
  for (const l of allLines(r))
    if (rx.test(l.item)) {
      const k = l.ingredientId ?? '(none)';
      by.set(k, [...(by.get(k) ?? []), `${r.id}:${r.cuisine}:${l.raw}`]);
    }
for (const [k, v] of [...by].sort((a, b) => b[1].length - a[1].length)) console.log(`${k} x${v.length}: ${v.slice(0, max).join(' || ').slice(0, 260)}`);
}
