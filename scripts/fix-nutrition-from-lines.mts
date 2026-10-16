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
import { estimateKcalPerServe, friesInOil, lineGrams, lineKcal } from './nutrition-estimate.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const fileArgs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--report');
const targets = fileArgs.length
  ? fileArgs.map((f) => (isAbsolute(f) ? f : existsSync(f) ? join(process.cwd(), f) : join(root, HOUSE_DIR, f)))
  : batchFiles(root).filter((f) => basename(f).startsWith('batch-04'));

/** Serving counts that were wrong for the amount the recipe makes. */
const SERVINGS: Record<string, number> = {
  // 2/3 cup barley, 2 potatoes and 6 cups stock make about 2 litres: six bowls, not three.
  'polish-krupnik-barley-soup': 6,
};

/** Share of a food's energy from protein, carbs and fat. First match wins. */
const PROFILE: [RegExp, [number, number, number]][] = [
  [/(^|-)oil$|olive-oil|lard|ghee|dripping|duck-fat|^butter$|vegan-butter/, [0, 0, 1]],
  [/mayo|aioli|pesto|tartare/, [0.01, 0.04, 0.95]],
  [/pastry|shortcrust/, [0.06, 0.4, 0.54]],
  [/coconut-milk|coconut-cream|^cream$|thickened-cream|double-cream|sour-cream|creme-fraiche|mascarpone|cream-cheese/, [0.05, 0.07, 0.88]],
  [/cottage-cheese|ricotta|paneer/, [0.4, 0.12, 0.48]],
  [/cheese|parmesan|pecorino|cheddar|gruyere|manchego|halloumi|feta|mozzarella/, [0.27, 0.03, 0.7]],
  [/egg/, [0.35, 0.02, 0.63]],
  [/bacon|pancetta|chorizo|salami|guanciale|pork-belly|sausage|bratwurst|frankfurt|pepperoni|ham/, [0.22, 0.03, 0.75]],
  [/fillet|breast|loin|topside|rump|escalope|chicken|turkey/, [0.6, 0, 0.4]],
  [/beef|lamb|pork|veal|oxtail|steak|mince|duck|goat|short-ribs/, [0.45, 0, 0.55]],
  [/salmon|trout|mackerel|sardine/, [0.45, 0, 0.55]],
  [/fish|prawn|calamari|clam|mussel|octopus|scallop|crab|lobster|squid|tuna|anchov/, [0.8, 0.03, 0.17]],
  [/tofu|tempeh|edamame/, [0.4, 0.1, 0.5]],
  [/lentil|split-pea|bean|chickpea|pea$/, [0.26, 0.68, 0.06]],
  [/nut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|seed|tahini|sesame/, [0.13, 0.12, 0.75]],
  [/chocolate|cocoa/, [0.06, 0.4, 0.54]],
  [/sugar|honey|syrup|treacle|jam$|molasses/, [0, 1, 0]],
  [/^milk$|full-cream-milk|soy-milk|oat-milk|buttermilk|yoghurt|yogurt|labneh|kefir/, [0.22, 0.3, 0.48]],
  [
    /flour|rice|pasta|spaghetti|noodle|bread|wrap|tortilla|pita|naan|roll|bun|oats|barley|couscous|quinoa|bulgur|semolina|polenta|panko|rusk/,
    [0.12, 0.83, 0.05],
  ],
  [/potato|kumara|plantain|cassava|taro|yam|corn/, [0.08, 0.89, 0.03]],
  [/stock|broth|sauce|paste|miso/, [0.3, 0.5, 0.2]],
];
const OTHER: [number, number, number] = [0.15, 0.75, 0.1];

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const aisleOf = (id: string) => index.byId.get(id)?.aisle;
const isMeat = (id: string) => /meat|seafood/.test(aisleOf(id) ?? '') && !/stock|bones|fat|dripping|lard/.test(id);
/** Raw meat or seafood a serve, in grams (the validator only asks for 10 g protein above 50 g). */
const meatGrams = (lines: IngredientLine[], servings: number) =>
  lines.reduce((t, l) => t + (l.ingredientId && isMeat(l.ingredientId) ? (lineGrams(l) ?? 50 * servings) : 0), 0) / servings;

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
    const meat = meatGrams(lines, servings) >= 50;
    if (!kcalOff && !(meat && nu.proteinG < 10) && servings === h.servings) continue;

    const fried = friesInOil(h.steps);
    let p = 0;
    let c = 0;
    let f = 0;
    for (const l of lines) {
      const k = l.ingredientId ? lineKcal(l, aisleOf, fried) : undefined;
      if (!k || !l.ingredientId) continue;
      const [pp, cc, ff] = PROFILE.find(([re]) => re.test(l.ingredientId ?? ''))?.[1] ?? OTHER;
      p += (k * pp) / 4;
      c += (k * cc) / 4;
      f += (k * ff) / 9;
    }
    const scale = 1 / servings;
    const next = { ...nu };
    if (kcalOff || servings !== h.servings) {
      next.proteinG = Math.round(p * scale);
      next.carbsG = Math.max(0, Math.round(c * scale - nu.fibreG / 2));
      next.fatG = Math.round(f * scale);
    } else {
      // kcal is fine, protein is short: raise protein to the line count and take the
      // difference out of carbs and fat in their stated proportion.
      next.proteinG = Math.max(nu.proteinG, Math.round(p * scale));
      const rest = nu.kcal - 4 * next.proteinG - 2 * nu.fibreG;
      const cE = 4 * nu.carbsG;
      const fE = 9 * nu.fatG;
      next.carbsG = Math.max(0, Math.round((rest * cE) / Math.max(1, cE + fE) / 4));
      next.fatG = Math.max(0, Math.round((rest * fE) / Math.max(1, cE + fE) / 9));
    }
    next.kcal = Math.round(4 * next.proteinG + 4 * next.carbsG + 9 * next.fatG + 2 * next.fibreG);
    const why = kcalOff
      ? `kcal x${ratio.toFixed(2)} of estimate ${Math.round(est.kcal)}`
      : servings !== h.servings
        ? 'servings'
        : 'protein floor';
    const flag = meat && next.proteinG < 10 ? '  (still under 10 g protein: check by hand)' : '';
    out.push(
      `${basename(file)} ${h.id} [${why}]` +
        (servings !== h.servings ? ` servings ${h.servings} -> ${servings};` : '') +
        ` ${nu.kcal} kcal p${nu.proteinG} c${nu.carbsG} f${nu.fatG} -> ${next.kcal} kcal p${next.proteinG} c${next.carbsG} f${next.fatG}${flag}`,
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
