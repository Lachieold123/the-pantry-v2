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

import type { IngredientLine } from '../src/domain/ingredients/types.ts';

export const KCAL: [RegExp, number][] = [
  // Specific ids that broader rules below would catch wrongly.
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
  [/ricotta|cottage-cheese/, 150],
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
  [/garlic/, 5],
  [/potato|sweet-potato/, 200],
  [/carrot|zucchini|capsicum|tomato|apple|pear|banana|orange/, 140],
  [/asian-eggplant/, 150],
  [/eggplant|cauliflower|broccoli|cabbage|lettuce/, 400],
  [/lemon|lime/, 0],
  [/chilli|ginger|herb|coriander|basil|mint|parsley|thyme|rosemary|bay|lemongrass|kaffir|lime-leaves/, 0],
  [/avocado/, 150],
  [/chicken-thigh$/, 110],
  [/chicken-breast/, 220],
  [/fillet|steak/, 180],
  [/tortilla|wrap|pita|naan|roll|bun/, 60],
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
  [/desiccated-coconut|shredded-coconut/, 0.35],
  [/oats/, 0.38],
  [/panko/, 0.25],
  [/breadcrumb/, 0.45],
  [/cocoa/, 0.4],
  [/icing-sugar/, 0.5],
  [/flour|cornflour|almond-meal/, 0.55],
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
];

export function lineGrams(l: IngredientLine): number | undefined {
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
  if (l.unit === 'fillet') return q * 170;
  if (l.unit === 'rasher') return q * 25;
  if (l.unit === 'slice') return q * 35;
  if (!l.unit) {
    const each = EACH_G.find(([re]) => re.test(id))?.[1];
    return each === undefined ? undefined : q * each;
  }
  return undefined; // pinch, bunch, sprig and the like: too small or too vague to count
}

export function kcalPer100(id: string, aisle?: string): number {
  return KCAL.find(([re]) => re.test(id))?.[1] ?? AISLE_KCAL[aisle ?? 'other'] ?? 50;
}

export type Estimate = { kcal: number; known: number; counted: number; cover: number };

/**
 * Per-serve kcal from the non-optional lines. `known` is how many lines had a
 * usable amount; `cover` is known / counted. Lines with no amount add nothing.
 */
export function estimateKcalPerServe(lines: IngredientLine[], servings: number, aisleOf: (id: string) => string | undefined): Estimate {
  const counted = lines.filter((l) => !l.optional);
  let known = 0;
  let kcal = 0;
  for (const l of counted) {
    const g = lineGrams(l);
    if (g === undefined || !l.ingredientId) continue;
    known++;
    kcal += (g * kcalPer100(l.ingredientId, aisleOf(l.ingredientId))) / 100;
  }
  return { kcal: kcal / Math.max(1, servings), known, counted: counted.length, cover: known / Math.max(1, counted.length) };
}
