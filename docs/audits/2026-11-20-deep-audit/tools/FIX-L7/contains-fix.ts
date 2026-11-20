// contains-fix.ts [--sample n] : FOOD-12. "Contains ..." notes that leave out a group the counted lines carry get the
// missing words added (recipe-text-checks containsGaps). Batch -> /tmp/l7-contains-edits.json, converted -> /tmp/l7-contains-fixes.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
import { containsGaps } from '../../../../../scripts/recipe-text-checks.mts';
import { all } from './batch-io.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const index = buildIngredientIndex(JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8')) as IngredientDef[]);
const inBatch = new Set([...all()].map(({ h }) => h.id as string));
const sample = process.argv.includes('--sample') ? Number(process.argv[process.argv.indexOf('--sample') + 1]) : 0;
const edits: Record<string, { replace: { in: 'notes'; from: string; to: string }[] }> = {};
const fixes: Record<string, { dropNotes: string[]; addNotes: string[] }> = {};
const tally: Record<string, number> = {};
const rows: string[] = [];
for (const r of recipes) {
  const lines = allLines(r).filter((l) => !l.optional);
  const groups = new Set(lines.flatMap((l) => (l.ingredientId ? (index.byId.get(l.ingredientId)?.groups ?? []) : [])));
  for (const g of containsGaps(r.notes ?? [], groups)) {
    for (const w of g.missing) tally[w] = (tally[w] ?? 0) + 1;
    const why = g.missing.map((w) => {
      const l = lines.find((x) => x.ingredientId && index.byId.get(x.ingredientId)?.groups.some((gr) => gr.replace('-', ' ').startsWith(w.replace('milk', 'dairy'))));
      return `${w}<-${l?.raw ?? '?'}`;
    });
    rows.push(`${r.id} | ${g.from} -> ${g.to} | ${why.join('; ')}`);
    if (inBatch.has(r.id)) (edits[r.id] ??= { replace: [] }).replace.push({ in: 'notes', from: g.from, to: g.to });
    else {
      const f = (fixes[r.id] ??= { dropNotes: [], addNotes: [] });
      f.dropNotes.push(g.note);
      f.addNotes.push(g.note.replace(g.from, g.to));
    }
  }
}
writeFileSync('/tmp/l7-contains-edits.json', JSON.stringify(edits, null, 1));
writeFileSync('/tmp/l7-contains-fixes.json', JSON.stringify(fixes, null, 1));
if (sample) for (let i = 0; i < rows.length; i += Math.ceil(rows.length / sample)) console.log(rows[i]!.slice(0, 260));
console.log(JSON.stringify(tally), { notes: rows.length, batch: Object.keys(edits).length, converted: Object.keys(fixes).length });
