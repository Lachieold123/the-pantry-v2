// claims-fix.ts <text-check log> <out edits.json> : for each unhedged "gluten-free" claim a label-dependent line breaks,
// write an edit-batch replace that hedges it with what to check. Only the breakers below; anything else is printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const defs: any[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
const groups = new Map(defs.map((d) => [d.id, d.groups as string[]]));
const CHECK: Record<string, string> = {
  'baking-powder': 'gluten-free baking powder',
  cornflour: 'cornflour labelled gluten-free',
  'smoked-sausage': 'a sausage labelled gluten-free',
};
const rx = /✗ ([a-z0-9-]+) \(house\): says "gluten-free" \("(.*?)"\) but/;
const edits: Record<string, { replace: { in: string; from: string; to: string }[] }> = {};
for (const line of readFileSync(process.argv[2]!, 'utf8').split('\n')) {
  const m = rx.exec(line);
  if (!m) continue;
  const [, id, sentence] = m as unknown as [string, string, string];
  const r = recipes.find((x) => x.id === id)!;
  const breakers = [...new Set(allLines(r).filter((l) => !l.optional && l.ingredientId && groups.get(l.ingredientId)?.includes('gluten')).map((l) => l.ingredientId!))];
  const uses = breakers.map((b) => CHECK[b]);
  if (uses.some((u) => !u) || sentence.length >= 80 || r.title.includes(sentence)) { console.log(`SKIP ${id}: [${breakers}] "${sentence}"`); continue; }
  const use = `if you use ${uses.join(' and ')}`;
  let to: string;
  const pair = /^(Vegetarian|Vegan|Dairy-free) and gluten[- ]free\.$/i.exec(sentence) ?? /^Gluten[- ]free and (vegetarian|vegan)\.$/i.exec(sentence);
  if (/^(Naturally )?gluten[- ]free\.$/i.test(sentence)) to = `Gluten-free ${use}.`;
  else if (pair) to = `${pair[1]![0]!.toUpperCase()}${pair[1]!.slice(1).toLowerCase()}; gluten-free ${use}.`;
  else if (/\bgluten-free(-style)? /i.test(sentence)) to = sentence.replace(/\b(naturally )?gluten-free(-style)? /i, '');
  else { console.log(`SKIP ${id}: no rule for "${sentence}"`); continue; }
  (edits[id] ??= { replace: [] }).replace.push({ in: 'text', from: sentence, to: to[0]!.toUpperCase() + to.slice(1) });
}
writeFileSync(process.argv[3]!, JSON.stringify(edits, null, 2));
console.log(Object.keys(edits).length, 'recipes;', Object.values(edits).flatMap((e) => e.replace).length, 'edits');
