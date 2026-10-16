// Rebuilds stated nutrition from the ingredient lines for batch-04 recipes that fail the
// validator's nutrition checks: stated kcal outside 0.55 to 1.8 of the estimate, or a meat
// or seafood dish under 10 g protein a serve. renormalise-nutrition.mts only scales the
// high ones down; this handles the low ones and the protein floor.
//
//   npx tsx scripts/fix-nutrition-from-lines.mts [files...] [--write] [--report out.txt]
//
// kcal comes from nutrition-estimate.mts. Protein, carbs and fat split each line's energy
// by a rough profile for its kind of food (oil is all fat, rice mostly carbs, and so on).
// Fibre and sodium keep their stated values. SERVINGS fixes a wrong serving count first.
// Decisions and spot checks: docs/NUTRITION-FIXUP-BATCH04.md.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { batchFiles, HOUSE_DIR, readBatch, toRecipe } from './house-recipes.mts';
import { estimateKcalPerServe, estimateMacrosPerServe } from './nutrition-estimate.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const fileArgs = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--report' && args[i - 1] !== '--band' && args[i - 1] !== '--ids',
);
const targets = fileArgs.length
  ? fileArgs.map((f) => (isAbsolute(f) ? f : existsSync(f) ? join(process.cwd(), f) : join(root, HOUSE_DIR, f)))
  : batchFiles(root).filter((f) => basename(f).startsWith('batch-04'));

/** Serving counts that were wrong for the amount the recipe makes. */
const SERVINGS: Record<string, number> = {
  // 2/3 cup barley, 2 potatoes and 6 cups stock make about 2 litres: six bowls, not three.
  'polish-krupnik-barley-soup': 6,
};

/**
 * Judgement for what the lines can't show: energy the method lifts out of the pot (skin
 * discarded, wings strained out of a broth, fat poured off with the cooking water). Share
 * of the line estimate actually eaten; the difference comes off fat first, then protein.
 */
const EATEN: Record<string, [number, string]> = {
  'korean-dakgomtang-chicken-soup': [0.75, 'skin discarded after poaching'],
  'pho-ga-with-charred-onion-and-rice-noodles': [0.8, 'chicken shredded off skin and bones, broth skimmed'],
  'silky-ramen-style-chicken-broth-with-greens': [0.6, 'wings strained out after 2 hours of broth'],
  'ayam-penyet-smashed-fried-chicken': [0.61, 'drumsticks fried in 250 ml oil; only about 15% is soaked up'],
  'new-england-boiled-dinner-corned-beef-cabbage-and-root-vegetables': [0.85, 'fat stays in the discarded cooking water'],
};

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const aisleOf = (id: string) => index.byId.get(id)?.aisle;
const isMeat = (id: string) => /meat|seafood/.test(aisleOf(id) ?? '') && !/stock|bones|fat|dripping|lard/.test(id);
/** --band 0.8: also rebuild recipes stated below that share of the estimate (they pass, but read low). */
const band = args.includes('--band') ? Number(args[args.indexOf('--band') + 1]) : 0;
/** --ids list.txt: limit the --band rebuild to these recipe ids (one a line). */
const idsPath = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : undefined;
const onlyIds = idsPath ? new Set(readFileSync(idsPath, 'utf8').split(/\s+/).filter(Boolean)) : undefined;

const out: string[] = [];
let fixed = 0;
for (const file of targets) {
  const batch = readBatch(file);
  let dirty = false;
  for (const h of batch.recipes) {
    const nu = h.nutrition;
    if (!nu) continue;
    const lines = toRecipe(h, root, index, () => {})
      .ingredientGroups.flatMap((g) => g.items)
      .filter((l) => !l.optional);
    const servings = SERVINGS[h.id] ?? h.servings;
    const est = estimateKcalPerServe(lines, servings, aisleOf, h.steps);
    const ratio = nu.kcal / Math.max(1, est.kcal);
    const kcalOff = est.cover >= 0.6 && est.kcal > 50 && (ratio < 0.55 || ratio > 1.8);
    // The band compares with the estimate after judgement (what is actually eaten).
    const low =
      !kcalOff &&
      band > 0 &&
      (!onlyIds || onlyIds.has(h.id)) &&
      est.cover >= 0.6 &&
      est.kcal > 50 &&
      nu.kcal < band * est.kcal * (EATEN[h.id]?.[0] ?? 1);
    const m = estimateMacrosPerServe(lines, servings, aisleOf, h.steps);
    // Same floor as the validator: 10 g, or 75% of what the lines give when they give less.
    const floor = lines.some((l) => l.ingredientId && isMeat(l.ingredientId)) ? Math.min(10, Math.floor(m.proteinG * 0.75)) : 0;
    const proteinShort = nu.proteinG < floor;
    if (!kcalOff && !low && !proteinShort && servings === h.servings) continue;

    const next = { ...nu };
    if (kcalOff || low || servings !== h.servings) {
      next.proteinG = Math.round(m.proteinG);
      next.carbsG = Math.max(0, Math.round(m.carbsG - nu.fibreG / 2));
      next.fatG = Math.round(m.fatG);
    } else {
      // kcal is fine, protein is short: raise protein to the line count and take the
      // difference out of carbs and fat in their stated proportion.
      next.proteinG = Math.max(nu.proteinG, Math.round(m.proteinG));
      const rest = nu.kcal - 4 * next.proteinG - 2 * nu.fibreG;
      const cE = 4 * nu.carbsG;
      const fE = 9 * nu.fatG;
      next.carbsG = Math.max(0, Math.round((rest * cE) / Math.max(1, cE + fE) / 4));
      next.fatG = Math.max(0, Math.round((rest * fE) / Math.max(1, cE + fE) / 9));
    }
    const eaten = EATEN[h.id]?.[0];
    if (eaten && (kcalOff || low)) {
      let cut = est.kcal * (1 - eaten);
      const fatCut = Math.min(next.fatG * 0.75, cut / 9);
      next.fatG = Math.round(next.fatG - fatCut);
      cut -= fatCut * 9;
      next.proteinG = Math.max(0, Math.round(next.proteinG - cut / 4));
    }
    next.kcal = Math.round(4 * next.proteinG + 4 * next.carbsG + 9 * next.fatG + 2 * next.fibreG);
    const why = kcalOff
      ? `kcal x${ratio.toFixed(2)} of estimate ${Math.round(est.kcal)}`
      : low
        ? `low: x${ratio.toFixed(2)} of estimate ${Math.round(est.kcal)}`
        : servings !== h.servings
          ? 'servings'
          : 'protein floor';
    const note = EATEN[h.id]?.[1];
    const judged = note && (kcalOff || low) ? ` (judgement: ${note})` : '';
    const flag = next.proteinG < floor ? '  (still under the protein floor: check by hand)' : '';
    out.push(
      `${basename(file)} ${h.id} [${why}]` +
        (servings !== h.servings ? ` servings ${h.servings} -> ${servings};` : '') +
        ` ${nu.kcal} kcal p${nu.proteinG} c${nu.carbsG} f${nu.fatG} -> ${next.kcal} kcal p${next.proteinG} c${next.carbsG} f${next.fatG}${judged}${flag}`,
    );
    fixed++;
    if (write) {
      h.servings = servings;
      h.nutrition = next;
      dirty = true;
    }
  }
  const indent = /\n( +)"/.exec(readFileSync(file, 'utf8'))?.[1]?.length ?? 1;
  if (dirty) writeFileSync(file, `${JSON.stringify(batch, null, indent)}\n`);
}
out.push(`${targets.length} files: ${fixed} recipes ${write ? 'rebuilt' : 'to rebuild (pass --write)'}`);
console.log(out.join('\n'));
if (reportPath) writeFileSync(reportPath, `${out.join('\n')}\n`);
