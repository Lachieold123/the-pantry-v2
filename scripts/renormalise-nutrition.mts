// Checks stated per-serve nutrition in house recipe files against the ingredient
// estimate (scripts/nutrition-estimate.mts) and, with --write, scales inflated
// entries back down. Written after the 17 Oct 2026 audit
// (docs/NUTRITION-AUDIT-2026-10-17.md): the old estimator read curries and rice
// dishes too high, and generators raised stated nutrition to pass it.
//
//   npx tsx scripts/renormalise-nutrition.mts                     every batch-04*.json, report only
//   npx tsx scripts/renormalise-nutrition.mts batch-04-B03.json   just these files (name or path)
//   ... --write                 scale flagged-high entries to the estimate (kcal, protein, carbs, fat, fibre)
//   ... --high 1.35 --low 0.7   flag bands for stated / estimate (defaults shown)
//   ... --min-cover 0.75        only judge recipes where this share of lines has a usable amount
//   ... --report <file>         also write the findings to a file
//
// It only lowers numbers (stated well above the estimate); low ones are listed
// for a person to check, because a low estimate usually means lines it can't
// weigh. Sodium is left alone. Run catalogue:validate afterwards.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import { batchFiles, HOUSE_DIR, readBatch, toRecipe, type Nutrition } from './house-recipes.mts';
import { estimateKcalPerServe } from './nutrition-estimate.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name: string, fallback: number) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback);
const write = args.includes('--write');
const high = opt('--high', 1.35);
const low = opt('--low', 0.7);
const minCover = opt('--min-cover', 0.75);
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const valued = new Set(['--high', '--low', '--min-cover', '--report']);
const fileArgs = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const targets = fileArgs.length
  ? fileArgs.map((f) => (isAbsolute(f) ? f : existsSync(f) ? join(process.cwd(), f) : join(root, HOUSE_DIR, f)))
  : batchFiles(root).filter((f) => basename(f).startsWith('batch-04'));

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const aisleOf = (id: string) => index.byId.get(id)?.aisle;

const SCALED: (keyof Nutrition)[] = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fibreG'];
const out: string[] = [];
let flaggedHigh = 0;
let flaggedLow = 0;
let changed = 0;

for (const file of targets) {
  const batch = readBatch(file);
  let dirty = false;
  for (const h of batch.recipes) {
    if (!h.nutrition) continue;
    const recipe = toRecipe(h, root, index, () => {});
    const est = estimateKcalPerServe(
      recipe.ingredientGroups.flatMap((g) => g.items),
      h.servings,
      aisleOf,
    );
    if (est.cover < minCover || est.kcal <= 50) continue;
    const ratio = h.nutrition.kcal / est.kcal;
    const where = `${basename(file)} ${h.id}: stated ${h.nutrition.kcal} kcal, estimate ${Math.round(est.kcal)} (x${ratio.toFixed(2)}, ${est.known}/${est.counted} lines)`;
    if (ratio > high) {
      flaggedHigh++;
      if (write) {
        const k = est.kcal / h.nutrition.kcal;
        for (const key of SCALED) h.nutrition[key] = Math.round(h.nutrition[key] * k);
        dirty = true;
        changed++;
        out.push(`HIGH  ${where} -> ${h.nutrition.kcal} kcal`);
      } else out.push(`HIGH  ${where}`);
    } else if (ratio < low) {
      flaggedLow++;
      out.push(`LOW   ${where}`);
    }
  }
  // Keep each file's own indent (the slices differ) so the diff shows only changed numbers.
  const indent = /\n( +)"/.exec(readFileSync(file, 'utf8'))?.[1]?.length ?? 1;
  if (dirty) writeFileSync(file, `${JSON.stringify(batch, null, indent)}\n`);
}

out.push(
  `${targets.length} files: ${flaggedHigh} stated well above the estimate (> x${high}), ${flaggedLow} well below (< x${low})` +
    (write ? `; scaled ${changed} down` : '; report only, pass --write to scale the high ones'),
);
console.log(out.join('\n'));
if (reportPath) writeFileSync(reportPath, `${out.join('\n')}\n`);
