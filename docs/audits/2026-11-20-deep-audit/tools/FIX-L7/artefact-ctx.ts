// artefact-ctx.ts : for each "<x>-free" artefact (recipe-text-checks rule), whether <x> appears in the recipe's other lines, and the lines (short).
import { readFileSync } from 'node:fs';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
import { artefactProblems } from '../../../../../scripts/recipe-text-checks.mts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
for (const r of recipes) {
  const lines = allLines(r).map((l) => l.raw);
  const p = artefactProblems([r.title, r.summary ?? '', ...lines, ...r.steps.map((s) => s.text)]);
  if (!p.length) continue;
  for (const x of p) {
    const w = /"([a-z]+)-free"/.exec(x)![1]!;
    const inLines = lines.filter((l) => new RegExp(`\\b${w}\\b(?!-free)`, 'i').test(l));
    console.log(`${r.id} | ${w} | in lines: ${inLines.join('; ') || 'NO'} | ${lines.join('; ').slice(0, 160)}`);
  }
}
