// Rough per-serve energy estimate for house recipes, from the ingredient lines.
// Used by validate-house-recipes.mts (sanity check on stated nutrition) and
// renormalise-nutrition.mts. Figures are kcal per 100 g (or ml) as bought:
// dry rice, pasta and pulses are dry weights, meat is raw. Rules are tried in
// order and the first match wins, so specific ids must sit above broad ones.
//
// 17 Oct 2026 audit (docs/NUTRITION-AUDIT-2026-10-17.md): the old table read
// coconut milk and cream as nuts (590 kcal), poured rice and grated cheese at
// water density (250 g a cup), counted a spring onion or shallot as a 130 g
// onion and a tin of tuna as 400 g. Curries, coconut stews and rice dishes came
// out 1.3 to 1.8 times too high, and generators inflated stated nutrition to pass.
//
// 17 Oct 2026 batch-04 fix-up (docs/NUTRITION-FIXUP-BATCH04.md): cooked rice was
// counted as dry (2.7 times too high), a dumpling wrapper as a 60 g wrap, deep-frying
// oil as if all of it were eaten, water at 15 kcal/100 g, shell-on clams and soup
// bones as meat, a corn tortilla at 60 g, an anchovy fillet at 170 g and a
// sun-dried tomato as a whole tomato.

import type { IngredientLine } from '../src/domain/ingredients/types.ts';

export const KCAL: [RegExp, number][] = [
  // Specific ids that broader rules below would catch wrongly.
  [/^water$|soda-water/, 0],
  [/bones$/, 25], // what a long simmer takes out of soup bones, not the bones themselves
  [/^clams$|mussel|pipi|cockle/, 30], // bought in the shell: about a fifth is meat
  [/lamb-leg/, 170], // bone-in
  [/short-ribs/, 200], // bone-in
  // Bone-in chicken as bought, less the fat that renders into the pan: about 70% is
  // eaten (drumsticks, pieces), 55% of a wing. Second pass, 17 Oct 2026.
  [/whole-chicken/, 140],
  [/chicken-drumstick|chicken-pieces/, 115],
  [/chicken-thigh-bone-in/, 160],
  [/chicken-wings/, 120],
  [/oxtail/, 140], // about half bone
  [/silken-tofu/, 55],
  [/fresh-tuna/, 120],
  [/frozen-chips/, 150], // oven chips, as bought frozen
  [/pork-ribs/, 180], // bone-in
  [/salami|pepperoni|chorizo/, 430], // cured and dry
  [/sausage|bratwurst|andouille|frankfurt|kransky|merguez/, 290], // fresh or smoked, not cured
  [/^ham$/, 125],
  [/olive$/, 145],
  [/roasted-capsicum/, 35],
  [/gnocchi/, 160],
  [/tomato-paste/, 80],
  [/sun-dried-tomato/, 250],
  [/^tomato$|cherry-tomato|tinned-tomatoes/, 22],
  [/wrapper/, 290],
  [/puff-pastry|shortcrust/, 400],
  [/filo/, 300],
  [/mango$/, 60],
  [/coleslaw/, 120],
  [/cottage-cheese/, 100],
  [/coconut-milk/, 190],
  [/coconut-cream/, 330],
  [/coconut-water/, 20],
  [/almond-milk/, 20],
  [/dashi/, 5],
  [/mayo|aioli/, 680],
  [/tartare-sauce/, 300],
  [/hoisin|bbq-sauce|sweet-chilli-sauce|teriyaki|satay-sauce|okonomiyaki|takoyaki|tomato-sauce|cranberry-sauce/, 150],
  [/pesto/, 450],
  [/rice-wine|brandy|rum$|whisky|vodka/, 200],
  [/sugar-snap|snow-pea/, 40],
  [/butternut|pumpkin$/, 40],
  [/ricotta/, 150],
  [/cucumber|daikon|radish|bok-choy|choy-sum|celery|lettuce|zucchini|spinach|cabbage|wombok/, 20],
  [/bean-sprouts|green-beans|snake-beans/, 30],
  [/kimchi|sauerkraut/, 25],
  [/fresh-rice-noodles|hokkien|udon|fresh-.*noodle/, 160],
  [/rice-cakes/, 230],
  [/starch/, 350],
  [/corn-chips/, 500],
  [/corn-tortilla/, 220],
  [/cornbread/, 330],
  [/dried-(\w+-)?beans?$|dried-chickpea/, 340],
  [/tinned-tuna/, 140],
  [/beef-shin|beef-chuck|shank/, 165],
  [/chicken-thigh$/, 150],
  // General rules.
  [/stock|^water$|broth|water|vinegar|sauce|juice|^lemon$|^lime$/, 15],
  [/(^|-)oil$|olive-oil|oil-spray|^ghee$|lard|dripping|duck-fat/, 880],
  [/^butter$|vegan-butter/, 720],
  [/sugar|honey|syrup|golden-syrup|treacle|jam$/, 380],
  [/flour|cornflour|polenta|semolina|^oats|rolled-oats|(^|-)bran($|-)/, 360],
  [/rice$|^rice|basmati|jasmine|arborio|quinoa|couscous|bulgur|barley|freekeh|farro|millet/, 355],
  [/pasta|spaghetti|penne|linguine|fettuccine|macaroni|orzo|lasagne|noodle|udon|soba|vermicelli|rigatoni/, 355],
  [/nut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|peanut|seed|tahini|sesame/, 590],
  [/chocolate|cocoa/, 520],
  [/^cream$|thickened-cream|double-cream|sour-cream|creme-fraiche|mascarpone|cream-cheese/, 340],
  [/cheese|parmesan|pecorino|cheddar|gruyere|manchego|halloumi|feta|mozzarella|paneer|monterey-jack/, 330],
  [/^milk$|full-cream-milk|oat-milk|soy-milk|buttermilk/, 55],
  [/yoghurt|yogurt|labneh|kefir/, 80],
  [/bacon|pancetta|chorizo|salami|guanciale|pork-belly|sausage|bratwurst|andouille|frankfurt|pepperoni/, 380],
  [/fillet|breast|loin|topside|rump|escalope/, 125],
  [/beef|lamb|pork|veal|oxtail|picanha|steak|mince|duck/, 220],
  [/chicken|turkey/, 170],
  [/salmon|tuna|trout|mackerel|sardine/, 190],
  [/fish|prawn|calamari|clam|mussel|octopus|scallop|crab|lobster|squid/, 100],
  [/tofu|tempeh/, 140],
  [/lentil|split-pea/, 340],
  [/bean|chickpea|lentils-tin|edamame/, 110],
  [/potato|sweet-potato|kumara|yam|taro|cassava|corn|parsnip/, 85],
  [/avocado/, 160],
  [/plantain/, 120],
  [/banana|date|raisin|sultana|dried|prune|fig/, 150],
  [/bread|wrap|tortilla|pita|naan|roll|bun|bagel|crumpet|brioche|panko|breadcrumb/, 270],
  [/curry-paste|paste$/, 150],
];
export const AISLE_KCAL: Record<string, number> = {
  'fruit-veg': 35,
  meat: 210,
  seafood: 110,
  deli: 260,
  'dairy-eggs': 150,
  bakery: 270,
  'pasta-rice-grains': 355,
  'tins-jars': 60,
  'sauces-oils': 120,
  'herbs-spices': 0,
  baking: 300,
  'asian-international': 120,
  'nuts-dried': 450,
  frozen: 70,
  drinks: 40,
  other: 50,
};
/** Grams in one of a counted thing, for the common ones. */
const EACH_G: [RegExp, number][] = [
  [/^egg$/, 50],
  [/spring-onion/, 15],
  [/shallot/, 30],
  [/onion/, 130],
  [/sun-dried/, 7],
  [/plantain/, 180],
  [/puff-pastry|shortcrust/, 170], // a sheet
  [/frankfurt/, 40],
  [/baguette/, 125], // a small one
  [/mango$/, 200],
  [/okra/, 12],
  [/corn-tortilla/, 28],
  [/wonton-wrapper|gyoza-wrapper/, 8],
  [/spring-roll-wrapper/, 13],
  [/garlic/, 5],
  [/potato|sweet-potato/, 200],
  [/carrot|zucchini|capsicum|tomato|apple|pear|banana|orange/, 140],
  [/asian-eggplant/, 150],
  [/eggplant|cauliflower|broccoli|cabbage|lettuce/, 400],
  [/lemon|lime/, 0],
  [/chilli|ginger|herb|coriander|basil|mint|parsley|thyme|rosemary|bay|lemongrass|kaffir|lime-leaves/, 0],
  [/avocado/, 150],
  [/chicken-thigh$/, 110],
  [/fresh-tuna/, 150], // a steak
  [/beef-sirloin|beef-rib-eye/, 220],
  [/chicken-drumstick/, 135],
  [/chicken-thigh-bone-in/, 170],
  [/chicken-wings/, 90],
  [/whole-chicken/, 1500],
  [/chicken-breast/, 220],
  [/fillet|steak/, 180],
  [/roti|chapati/, 45],
  [/paratha/, 80],
  [/tortilla|wrap|pita|naan|roll|bun|flatbread/, 60],
];
/** Grams in one tin, where it isn't the usual 400 g. Tinned pulses are counted drained. */
const TIN_G: [RegExp, number][] = [
  [/tuna|salmon|sardine/, 185],
  [/bean|chickpea|lentil/, 240],
];
const ML_PER = { tsp: 5, tbsp: 15, cup: 250, ml: 1, l: 1000 } as const;
/** Grams per ml for things measured by volume. Anything not listed is taken as water (1). */
const DENSITY: [RegExp, number][] = [
  [/(^|-)oil$|olive-oil/, 0.92],
  [/coconut-milk|coconut-cream|almond-milk|peanut-butter|tahini/, 1],
  [/corn-chips/, 0.2],
  [/coleslaw/, 0.45],
  [/desiccated-coconut|shredded-coconut/, 0.35],
  [/oats/, 0.38],
  [/panko/, 0.25],
  [/breadcrumb/, 0.45],
  [/cocoa/, 0.4],
  [/icing-sugar/, 0.5],
  [/flour|cornflour|almond-meal|starch/, 0.55],
  [/sugar/, 0.85],
  [/honey|syrup/, 1.4],
  [/rice$|^rice|basmati|jasmine|arborio|quinoa|couscous|bulgur|barley|freekeh|farro|millet|lentil|split-pea|orzo|polenta|semolina/, 0.8],
  [/nut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|peanut|seed/, 0.6],
  [
    /parmesan|pecorino|cheddar|gruyere|manchego|mozzarella|tasty|swiss-cheese|monterey-jack|american-cheese|feta|halloumi|goat-cheese|blue-cheese/,
    0.45,
  ],
  [/frozen-peas|corn-kernels|edamame|frozen-berries/, 0.6],
  [/parsley|coriander|basil|mint|dill|chives|spinach|rocket|watercress|herb/, 0.15],
  [/cabbage|lettuce|kale/, 0.35],
  [/salad-leaves/, 0.1],
];

export function lineGrams(l: IngredientLine): number | undefined {
  const tins = /^(\d+)\s*x\s*\d+\s*g\b/i.exec(l.raw);
  if (tins) return Number(tins[1]) * (TIN_G.find(([re]) => re.test(l.ingredientId ?? ''))?.[1] ?? 400);
  if (l.quantity === undefined) return undefined;
  const q = typeof l.quantity === 'number' ? l.quantity : (l.quantity.min + l.quantity.max) / 2;
  const id = l.ingredientId ?? '';
  if (l.unit === 'g') return q;
  if (l.unit === 'kg') return q * 1000;
  if (l.unit && l.unit in ML_PER) {
    const dens = DENSITY.find(([re]) => re.test(id))?.[1] ?? 1;
    return q * ML_PER[l.unit as keyof typeof ML_PER] * dens;
  }
  if (l.unit === 'tin') return q * (TIN_G.find(([re]) => re.test(id))?.[1] ?? 400);
  if (l.unit === 'clove') return q * 5;
  if (l.unit === 'fillet') return q * (/anchov/.test(id) ? 4 : 170);
  if (l.unit === 'rasher') return q * 25;
  if (l.unit === 'slice') return q * (/bacon/.test(id) ? 25 : /prosciutto|salami|pepperoni/.test(id) ? 15 : 35);
  if (l.unit === 'sheet')
    return q * (/puff-pastry|shortcrust/.test(id) ? 170 : /filo/.test(id) ? 20 : /nori/.test(id) ? 3 : /rice-paper/.test(id) ? 9 : 20);
  const each = !l.unit ? EACH_G.find(([re]) => re.test(id))?.[1] : undefined;
  if (each !== undefined) return q * each;
  // "1 whole perch (about 500 g)" or "2 whole fish (400 g each)": the bracketed weight on a count or head/bunch line.
  const about = /\(\s*(?:about|approx\.?|roughly)?\s*(\d+(?:\.\d+)?)\s*g\s*\)/i.exec(l.raw);
  if (about) return Number(about[1]);
  const perEach = /\(\s*(\d+(?:\.\d+)?)\s*g each\s*\)/i.exec(l.raw);
  if (perEach) return q * Number(perEach[1]);
  return undefined; // pinch, bunch, sprig and the like: too small or too vague to count
}

export function kcalPer100(id: string, aisle?: string): number {
  return KCAL.find(([re]) => re.test(id))?.[1] ?? AISLE_KCAL[aisle ?? 'other'] ?? 50;
}

const GRAIN =
  /rice$|^rice|basmati|jasmine|arborio|quinoa|couscous|bulgur|barley|freekeh|farro|millet|pasta|spaghetti|penne|macaroni|noodle/;
const OIL = /(^|-)oil$|olive-oil/;
/** Cooked rice, pasta and grains: about 140 kcal/100 g and 160 g a cup, not the dry figures. */
const isCookedGrain = (l: IngredientLine) => GRAIN.test(l.ingredientId ?? '') && /\bcooked\b/i.test(l.raw);
/** Whether a method deep- or shallow-fries in a bath of oil (rather than eating the oil, as in a pesto or chilli oil). */
export const friesInOil = (steps: string[]) =>
  /deep[- ]?fr(y|ied|ies)|shallow[- ]?fr(y|ied|ies)|for frying|fry[^.]{0,30}in batches|drain(ed)? on (paper|kitchen) towel|oil[^.]{0,60}1[5-9]0\s?°C|1[5-9]0\s?°C[^.]{0,20}oil/i.test(
    steps.join(' '),
  );
/** Oil "for frying", or half a cup or more when the method fries in it: count what the food soaks up (about 15%). */
const isFryingOil = (l: IngredientLine, g: number, fried: boolean) =>
  OIL.test(l.ingredientId ?? '') && ((fried && g >= 100) || /for (deep[- ]?|shallow[- ]?)?frying/i.test(l.raw));

const AS_BOUGHT_WITH_BONE = /whole-chicken|chicken-drumstick|chicken-pieces|chicken-thigh-bone-in|chicken-wings|pork-ribs|oxtail/;

/** kcal for one line, or undefined when it has no usable amount. */
export function lineKcal(l: IngredientLine, aisleOf: (id: string) => string | undefined, fried = false): number | undefined {
  const id = l.ingredientId;
  let g = lineGrams(l);
  if (g === undefined || !id) return undefined;
  if (isCookedGrain(l)) {
    if (l.unit && l.unit in ML_PER) g = (g / (DENSITY.find(([re]) => re.test(id))?.[1] ?? 1)) * 0.65;
    return (g * 140) / 100;
  }
  // Cooked lentils, beans and chickpeas: about 120 kcal/100 g, not the dry 340.
  if (/lentil|split-pea|chickpea|bean/.test(id) && /\bcooked\b/i.test(l.raw)) return (g * 120) / 100;
  // "800g tinned chickpeas, drained" is the tin weight (whole 400/420/425 g tins); pulses are counted
  // drained, 60% of that. Other gram amounts ("240g tinned chickpeas, drained") are taken as drained.
  if (
    /chickpea|bean|lentil/.test(id) &&
    !/green-bean|bean-sprout/.test(id) &&
    /\b(tin|tins|tinned|can|cans|canned)\b/i.test(l.raw) &&
    (l.unit === 'g' || l.unit === 'kg') &&
    [400, 420, 425].some((t) => Math.round(g!) % t === 0)
  )
    g *= 0.6;
  if (isFryingOil(l, g, fried)) g *= 0.15;
  // "bone in" takes 20% off, except for ids whose figure above is already as bought with the bone.
  if (/bone[- ]in/i.test(l.raw) && !AS_BOUGHT_WITH_BONE.test(id)) g *= 0.8;
  // Dried or split pulses (chana dal, dried chickpeas) often link to the tinned ingredient.
  if (/chickpea|bean|lentil/.test(id) && /\bdried\b|\bdal\b|\bsplit\b/i.test(l.raw) && !/tin|can\b|cans\b|drained/i.test(l.raw))
    return (g * 340) / 100;
  return (g * kcalPer100(id, aisleOf(id))) / 100;
}

export type Estimate = { kcal: number; known: number; counted: number; cover: number };

/**
 * Per-serve kcal from the non-optional lines. `known` is how many lines had a
 * usable amount; `cover` is known / counted. Lines with no amount add nothing.
 */
export function estimateKcalPerServe(
  lines: IngredientLine[],
  servings: number,
  aisleOf: (id: string) => string | undefined,
  steps: string[] = [],
): Estimate {
  const fried = friesInOil(steps);
  const counted = lines.filter((l) => !l.optional);
  let known = 0;
  let kcal = 0;
  for (const l of counted) {
    const k = lineKcal(l, aisleOf, fried);
    if (k === undefined) continue;
    known++;
    kcal += k;
  }
  return { kcal: kcal / Math.max(1, servings), known, counted: counted.length, cover: known / Math.max(1, counted.length) };
}

/**
 * Share of a food's energy from protein, carbs and fat, for splitting a line's kcal
 * into macros. First match wins. Used by fix-nutrition-from-lines.mts to rebuild stated
 * macros and by the validator's protein floor. Rough, but by food type rather than one
 * flat split: oil is all fat, rice mostly carbs, lean fish mostly protein.
 */
export const MACRO_SHARE: [RegExp, [number, number, number]][] = [
  [/^water$|soda-water/, [0, 0, 0]],
  [/(^|-)oil$|olive-oil|lard|ghee|dripping|duck-fat|^butter$|vegan-butter/, [0, 0, 1]],
  [/mayo|aioli|pesto|tartare/, [0.01, 0.04, 0.95]],
  [/olive$|avocado/, [0.04, 0.08, 0.88]],
  [/pastry|shortcrust/, [0.06, 0.4, 0.54]],
  [/frozen-chips|corn-chips/, [0.06, 0.55, 0.39]],
  [/wrapper/, [0.12, 0.85, 0.03]],
  [/coconut-milk|coconut-cream|^cream$|thickened-cream|double-cream|sour-cream|creme-fraiche|mascarpone|cream-cheese/, [0.05, 0.07, 0.88]],
  [/cottage-cheese|ricotta|paneer/, [0.4, 0.12, 0.48]],
  [/cheese|parmesan|pecorino|cheddar|gruyere|manchego|halloumi|feta|mozzarella/, [0.27, 0.03, 0.7]],
  [/egg$|^eggs?$|egg-yolk|egg-white/, [0.35, 0.02, 0.63]],
  [/^ham$/, [0.6, 0.05, 0.35]],
  [/bacon|pancetta|guanciale|pork-belly|prosciutto/, [0.25, 0, 0.75]],
  [/chorizo|salami|sausage|bratwurst|frankfurt|pepperoni|kransky|merguez|andouille/, [0.2, 0.05, 0.75]],
  [/whole-chicken|chicken-drumstick|chicken-pieces|chicken-wings|chicken-thigh-bone-in|duck/, [0.4, 0, 0.6]],
  [/chicken-breast|fillet|loin|topside|rump|escalope|turkey/, [0.7, 0, 0.3]],
  [/chicken/, [0.55, 0, 0.45]],
  [/beef|lamb|pork|veal|oxtail|steak|mince|goat|short-ribs|liver/, [0.45, 0, 0.55]],
  [/salmon|trout|mackerel|sardine/, [0.45, 0, 0.55]],
  [/fish|prawn|calamari|clam|mussel|octopus|scallop|crab|lobster|squid|tuna|anchov|cod|snapper|barramundi/, [0.8, 0.03, 0.17]],
  [/tofu|tempeh|edamame/, [0.43, 0.05, 0.52]],
  [/lentil|split-pea|bean|chickpea|pea$|peas$|dal$/, [0.26, 0.66, 0.08]],
  [/nut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|seed|tahini|sesame/, [0.13, 0.12, 0.75]],
  [/chocolate|cocoa/, [0.06, 0.4, 0.54]],
  [/sugar|honey|syrup|treacle|jam$|molasses|starch/, [0, 1, 0]],
  [/hoisin|bbq-sauce|sweet-chilli|tomato-sauce|ketchup|teriyaki|cranberry|plum-sauce|chutney|relish/, [0.03, 0.95, 0.02]],
  [/^milk$|full-cream-milk|soy-milk|oat-milk|buttermilk|yoghurt|yogurt|labneh|kefir/, [0.22, 0.3, 0.48]],
  [/apple|pear|banana|mango|orange|berr|raisin|sultana|date|prune|fig|apricot|pineapple|grape|peach|plantain/, [0.04, 0.93, 0.03]],
  [
    /flour|rice|pasta|spaghetti|noodle|bread|wrap|tortilla|pita|naan|roll|bun|oats|barley|couscous|quinoa|bulgur|semolina|polenta|panko|rusk|baguette|gnocchi|orzo/,
    [0.12, 0.83, 0.05],
  ],
  [/potato|kumara|cassava|taro|yam|corn/, [0.08, 0.89, 0.03]],
  [/stock|broth|soy-sauce|fish-sauce|miso/, [0.35, 0.5, 0.15]],
  [/curry-paste|paste$/, [0.08, 0.45, 0.47]],
];
const OTHER_SHARE: [number, number, number] = [0.15, 0.75, 0.1]; // vegetables and the rest

export const macroShare = (id: string): [number, number, number] => MACRO_SHARE.find(([re]) => re.test(id))?.[1] ?? OTHER_SHARE;

/** Protein, carbs and fat (g) a serve from the lines, splitting each line's kcal by its food type. */
export function estimateMacrosPerServe(
  lines: IngredientLine[],
  servings: number,
  aisleOf: (id: string) => string | undefined,
  steps: string[] = [],
): { proteinG: number; carbsG: number; fatG: number } {
  const fried = friesInOil(steps);
  let p = 0;
  let c = 0;
  let f = 0;
  for (const l of lines) {
    if (l.optional || !l.ingredientId) continue;
    const k = lineKcal(l, aisleOf, fried);
    if (!k) continue;
    const [pp, cc, ff] = macroShare(l.ingredientId);
    p += (k * pp) / 4;
    c += (k * cc) / 4;
    f += (k * ff) / 9;
  }
  const n = Math.max(1, servings);
  return { proteinG: p / n, carbsG: c / n, fatG: f / n };
}
