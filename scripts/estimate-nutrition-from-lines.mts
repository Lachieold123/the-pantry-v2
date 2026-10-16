// Gives batch-01 to 03 house recipes (which had no nutrition) a per-serve nutrition
// estimate worked out from their ingredient lines, the same way as batch-04:
// kcal, protein, carbs and fat from nutrition-estimate.mts (estimateKcalPerServe and
// estimateMacrosPerServe); fibre and sodium from the rough per-food tables below.
// Nothing is stated by hand or scaled to pass the validator. Lines with no usable amount
// (a pinch, "to taste", a bunch) add nothing, except salt: see SEASONING_SALT_G.
//
//   npx tsx scripts/estimate-nutrition-from-lines.mts [files...] [--write] [--report out.txt]
//
// Default files: batch-01.json, batch-02.json, batch-03.json. Recipes that already have
// nutrition are left alone. Recipes whose lines can't be weighed well (cover under 0.6)
// or that land outside 40 to 1600 kcal are listed and NOT written.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { HOUSE_DIR, readBatch, toRecipe } from './house-recipes.mts';
import { estimateKcalPerServe, estimateMacrosPerServe, lineGrams, lineKcal, friesInOil } from './nutrition-estimate.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const fileArgs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--report');
const targets = (fileArgs.length ? fileArgs : ['batch-01.json', 'batch-02.json', 'batch-03.json']).map((f) =>
  isAbsolute(f) ? f : existsSync(f) ? join(process.cwd(), f) : join(root, HOUSE_DIR, f),
);

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const aisleOf = (id: string) => index.byId.get(id)?.aisle;

/** Fibre in g per 100 kcal of the food, by id (first match wins), else by aisle. */
const FIBRE_PER_100KCAL: [RegExp, number][] = [
  [/lentil|split-pea|chickpea|bean|dal$|edamame|^peas?$|green-pea/, 5],
  [/oats|wholemeal|wholegrain|brown-rice|barley|bulgur|freekeh|quinoa|farro|rye|muesli|bran/, 1.8],
  [/chia|flax|linseed/, 3.5],
  [/almond|walnut|pecan|hazelnut|pistachio|macadamia|cashew|peanut|seed|tahini|sesame|coconut/, 1.3],
  [/potato|kumara|cassava|taro|yam|^corn|sweetcorn|pumpkin|beetroot|carrot|parsnip/, 3],
  [
    /flour|rice|pasta|spaghetti|noodle|bread|wrap|tortilla|pita|naan|roll|bun|couscous|polenta|semolina|panko|baguette|gnocchi|orzo|pastry|wrapper|crumb/,
    0.6,
  ],
  [/apple|pear|banana|mango|orange|berr|raisin|sultana|date|prune|fig|apricot|pineapple|grape|peach|plum|cherry|lemon|lime/, 4],
  [/chocolate|cocoa/, 1.5],
  [/tomato-paste|curry-paste|spice|cumin|coriander-seed|turmeric|paprika|chilli-powder|cinnamon|pepper$/, 5],
  [
    /oil$|butter|ghee|lard|dripping|cream|cheese|milk|yoghurt|yogurt|egg|sugar|honey|syrup|mayo|stock|broth|sauce|vinegar|wine|beer|water|salt|gelatine|fish|prawn|squid|calamari|chicken|beef|lamb|pork|bacon|ham|duck|turkey|sausage|salami|chorizo|prosciutto|pancetta|mince|veal|tofu|tempeh/,
    0,
  ],
];
const FIBRE_BY_AISLE: Record<string, number> = {
  'fruit-veg': 7,
  'herbs-spices': 5,
  'tins-jars': 2.5,
  'pasta-rice-grains': 0.8,
  'nuts-dried': 1.5,
  baking: 0.5,
};
const fibrePer100Kcal = (id: string) => FIBRE_PER_100KCAL.find(([re]) => re.test(id))?.[1] ?? FIBRE_BY_AISLE[aisleOf(id) ?? ''] ?? 0.5;

/** Sodium in mg per 100 g as used, by id (first match wins). Rough, from common label values. */
const SODIUM_PER_100G: [RegExp, number][] = [
  [/^salt-fish$|salt-?cod|salted-cod|saltfish|salt-fish|bacalao|baccala|stockfish|salt-?fish/, 800], // soaked/desalted as the recipes direct
  [/^salt$|sea-salt|flaky-salt|kosher-salt|table-salt/, 38800],
  [/sauerkraut|kimchi/, 800],
  [/stock-(cube|powder|concentrate)|bouillon/, 18000],
  [/fish-sauce/, 7000],
  [/soy-sauce|tamari|shoyu/, 5600],
  [/oyster-sauce/, 2700],
  [/miso/, 3700],
  [/anchov/, 3000],
  [/caper|olive/, 2000],
  [/pickle|gherkin|daikon-pickle/, 800],
  [
    /hoisin|worcestershire|bbq-sauce|teriyaki|sweet-chilli|plum-sauce|tomato-sauce|ketchup|mustard|curry-paste|doenjang|gochujang|harissa/,
    1500,
  ],
  [/prosciutto|salami|chorizo|pepperoni|^ham$|jamon|frankfurt/, 1500],
  [/bacon|pancetta|guanciale/, 1200],
  [/kransky|smoked-sausage|kielbasa/, 1000],
  [/parmesan|pecorino/, 1500],
  [/halloumi|feta/, 1100],
  [/sausage|bratwurst|merguez|andouille/, 900],
  [/cheddar|gruyere|mozzarella|cheese/, 600],
  [/stock|broth/, 300],
  [/bread|baguette|wrap|tortilla|pita|naan|roll|bun|pastry|wrapper/, 500],
  [/tuna|salmon.*tin|sardine/, 350],
  [/prawn|squid|calamari|clam|mussel|scallop|crab|lobster|octopus/, 300],
  [/tomato.*(tin|crushed|diced|passata)|crushed-tomato|diced-tomato|passata/, 150],
  [/egg/, 140],
  [/butter/, 400],
  [/chicken|beef|lamb|pork|veal|duck|turkey|mince|steak|fish|goat/, 75],
  [/milk|yoghurt|yogurt|cream/, 50],
  [/oil$|sugar|honey|syrup|flour|rice|pasta|spaghetti|noodle|oats|lentil|chickpea|bean|nut|almond|seed|water|wine|vinegar/, 12],
];
const sodiumPer100g = (id: string, aisle?: string) =>
  SODIUM_PER_100G.find(([re]) => re.test(id))?.[1] ?? (aisle === 'fruit-veg' ? 25 : aisle === 'herbs-spices' ? 30 : 60);
/** Salt that goes into cooking or curing water, a brine or a cure is mostly not eaten: count a quarter of it. */
const SALT_LOST = /\bcure[ds]?\b|\bbrine\b|salted water|boil[^.]*\bsalt|\bsalt[^.]*(boiling|water)|rinse (off )?the salt/i;
const isSalt = (id: string) => /^salt$|sea-salt|flaky-salt|kosher-salt|table-salt/.test(id);
/** "Salt, to taste" and the like have no amount: count a small seasoning of salt for the whole dish (g). */
const SEASONING_SALT_G = 1.5;

/** Lines that rarely add real energy when they have no amount: seasoning, herbs, aromatics, garnish, water, greasing oil. */
const TRIVIAL =
  /^salt|pepper|water|ginger|galangal|lemongrass|bay-leaf|lime-leaf|star-anise|cinnamon|cloves|cardamom|^lime$|^lemon$|^oil$|greas/;
const isTrivial = (l: IngredientLine) =>
  TRIVIAL.test(l.ingredientId ?? '') ||
  aisleOf(l.ingredientId ?? '') === 'herbs-spices' ||
  /to serve|to taste|for (greasing|cooking|the grill|frying)|garnish|handful|bunch/i.test(l.raw);

/** Judgement for what the lines can't show: share of the line-based sodium actually eaten (marinade or broth left behind). */
const SODIUM_EATEN: Record<string, [number, string]> = {
  'hand-pulled-lanzhou-noodles': [0.8, 'noodles boiled in salted water and part of the 1.5 litres of broth left in the bowl'],
  'banh-mi-thit-nuong': [0.8, 'fish-sauce marinade partly left on the board and the grill'],
};
/** Left out on purpose: the ingredient link is wrong for the line, so the lines can't be trusted (list in the handoff). */
const SKIP_IDS: Record<string, string> = {
  'gat-kimchi': '"mustard greens" links to the mustard condiment, so energy and sodium are overstated',
};

type Calc = { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; sodiumMg: number; cover: number };

function calc(lines: IngredientLine[], servings: number, steps: string[], title: string): Calc {
  const est = estimateKcalPerServe(lines, servings, aisleOf, steps);
  const m = estimateMacrosPerServe(lines, servings, aisleOf, steps);
  const fried0 = friesInOil(steps);
  const weighable = lines.filter((l) => !isTrivial(l));
  const substantiveCover = weighable.length
    ? weighable.filter((l) => lineKcal(l, aisleOf, fried0) !== undefined).length / weighable.length
    : 1;
  const fried = friesInOil(steps);
  let fibre = 0;
  let sodium = 0;
  let hasSalt = false;
  const saltLost = SALT_LOST.test(steps.join('. ')) || /gravad|gravlax|cured/.test(title);
  for (const l of lines) {
    if (l.optional || !l.ingredientId) continue;
    const id = l.ingredientId;
    if (isSalt(id)) {
      const g = lineGrams(l);
      if (g === undefined) hasSalt = true;
      else sodium += (g * 38800 * (saltLost || /divided/i.test(l.raw) ? 0.25 : 1)) / 100;
      continue;
    }
    const k = lineKcal(l, aisleOf, fried);
    if (!k) continue;
    fibre += (k * fibrePer100Kcal(id)) / 100;
    const g = lineGrams(l);
    // Stock and sauces by volume are weighed already; frying oil carries no sodium. Use grams as bought.
    if (g !== undefined) sodium += (g * sodiumPer100g(id, aisleOf(id))) / 100;
  }
  if (hasSalt) sodium += (SEASONING_SALT_G * 38800) / 100;
  const n = Math.max(1, servings);
  const fibreG = Math.round(fibre / n);
  const proteinG = Math.round(m.proteinG);
  const fatG = Math.round(m.fatG);
  const carbsG = Math.max(0, Math.round(m.carbsG - fibreG / 2));
  const kcal = Math.round(4 * proteinG + 4 * carbsG + 9 * fatG + 2 * fibreG);
  return {
    kcal,
    proteinG,
    carbsG,
    fatG,
    fibreG,
    sodiumMg: Math.round((sodium * (SODIUM_EATEN[title]?.[0] ?? 1)) / n / 5) * 5,
    cover: substantiveCover,
  };
}

const out: string[] = [];
let done = 0;
let skipped = 0;
for (const file of targets) {
  const batch = readBatch(file);
  let dirty = false;
  for (const h of batch.recipes) {
    if (h.nutrition) continue;
    if (SKIP_IDS[h.id]) {
      skipped++;
      out.push(`SKIP ${basename(file)} ${h.id} ${SKIP_IDS[h.id]}`);
      continue;
    }
    const lines = toRecipe(h, root, index, () => {})
      .ingredientGroups.flatMap((g) => g.items)
      .filter((l) => !l.optional);
    const c = calc(lines, h.servings, h.steps, h.id);
    if (c.cover < 0.6 || c.kcal < 40 || c.kcal > 1600) {
      skipped++;
      out.push(`SKIP ${basename(file)} ${h.id} cover ${c.cover.toFixed(2)} kcal ${c.kcal}`);
      continue;
    }
    done++;
    if (write) {
      h.nutrition = { kcal: c.kcal, proteinG: c.proteinG, carbsG: c.carbsG, fatG: c.fatG, fibreG: c.fibreG, sodiumMg: c.sodiumMg };
      dirty = true;
    }
    out.push(
      `${basename(file)} ${h.id} cover ${c.cover.toFixed(2)} ${c.kcal} kcal p${c.proteinG} c${c.carbsG} f${c.fatG} fibre${c.fibreG} Na${c.sodiumMg}`,
    );
  }
  const indent = /\n( +)"/.exec(readFileSync(file, 'utf8'))?.[1]?.length ?? 1;
  if (dirty) writeFileSync(file, `${JSON.stringify(batch, null, indent)}\n`);
}
out.push(`${targets.length} files: ${done} ${write ? 'written' : 'to write (pass --write)'}, ${skipped} skipped`);
console.log(out.join('\n'));
if (reportPath) writeFileSync(reportPath, `${out.join('\n')}\n`);
