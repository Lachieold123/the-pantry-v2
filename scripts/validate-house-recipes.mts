// The single gate for new house recipe batches (batch-04 on). It runs the
// repo's own checks (house-recipes.mts: every line matches the ingredient
// database, stated diets equal the diets the app derives, ids and titles new,
// validateRecipe) and adds the checks that used to live elsewhere:
// batch-03's allergen, time, amount and food-safety checks and the
// 12 Oct pilot's (HQ check_recipes.py) tag-vs-text, doneness, duplicate and
// style checks, plus schema, alternatives, hard cheese and nutrition.
//
//   npm run catalogue:validate                       every batch in scripts/data/house-recipes
//   npm run catalogue:validate -- batch-04.json      just these files (name or path)
//   ... --report docs/validator-batch-01.txt         also write every finding to a file
//   ... --no-nutrition                               don't require a nutrition estimate (older batches)
//
// Failures exit non-zero. Warnings are things a person should glance at.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, normaliseWords, type IngredientDef, type IngredientGroup } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import { CUISINES, DIET_TAGS, DIFFICULTIES, MEAL_TYPES, SEASONS, type Recipe } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';
import { batchFiles, HOUSE_DIR, readBatch, toRecipe, type HouseRecipe } from './house-recipes.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const requireNutrition = !args.includes('--no-nutrition');
const fileArgs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--report');
const targets = fileArgs.length
  ? fileArgs.map((f) => (isAbsolute(f) ? f : existsSync(f) ? join(process.cwd(), f) : join(root, HOUSE_DIR, f)))
  : batchFiles(root);

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const def = (id?: string) => (id ? index.byId.get(id) : undefined);

// ---------- findings ----------

type Finding = { file: string; id: string; level: 'fail' | 'warn'; check: string; detail: string };
const findings: Finding[] = [];
let current = { file: '', id: '' };
// Findings a person has reviewed and accepted (17 Oct 2026). They stay visible as warnings.
const REVIEWED: Record<string, Record<string, string>> = {
  'panang-beef-curry': { 'near-duplicate': "a Thai curry, not the catalogue's Beef Curry" },
  'hainanese-chicken-rice': { 'near-duplicate': 'a named dish, not the generic Chicken and Rice' },
  'ahi-poke-bowl': { 'near-duplicate': 'tuna poke, a different recipe from the catalogue Poke Bowl' },
  'fiji-style-fish-curry': { 'near-duplicate': 'a regional curry, different from the catalogue Fish Curry' },
  'pork-and-chive-dumplings': { 'near-duplicate': 'a different filling from Pork Dumplings' },
  'banh-mi-chay': { 'near-duplicate': 'the vegetarian banh mi' },
  'thai-green-curry-with-prawns-and-beans': { 'near-duplicate': 'the prawn version' },
  'teriyaki-chicken-plate': { 'near-duplicate': 'a Hawaiian plate lunch, not the Japanese dish' },
  'miso-soup-with-hamaguri': { 'near-duplicate': 'clam miso soup' },
  'lentil-and-rice-soup': { 'near-duplicate': 'a different soup from Lentil Soup' },
  'honey-soy-chicken-stir-fry': { 'near-duplicate': 'a named stir-fry' },
  tabbouleh: { duplicate: 'the 12 Oct pilot is not in the app or the feed; this is the only copy' },
  'chicken-inasal': { duplicate: 'the 12 Oct pilot is not in the app or the feed; this is the only copy' },
  kleicha: { servings: 'counts biscuits' },
  baklava: { servings: 'counts pieces' },
  'wattleseed-and-macadamia-biscuits': { servings: 'counts biscuits' },
  'to-ona-i-sunday-spread': { servings: 'a feast for a crowd' },
  'beef-stew-with-dumplings': { time: 'the step sum counts the slow-cooker and stove options twice' },
  'camp-oven-rabbit-stew': { time: 'the step sum counts overlapping simmering times' },
  'slow-cooker-lamb-neck-with-tomato': { time: 'the step sum counts the low and high options twice' },
  'gravad-lax-med-senapssas': { amounts: 'curing salt, wiped off before serving' },
  'gat-kimchi': { amounts: 'brining salt, rinsed off' },
};
const fail = (check: string, detail: string) =>
  REVIEWED[current.id]?.[check]
    ? findings.push({ ...current, level: 'warn', check, detail: `${detail} (reviewed: ${REVIEWED[current.id]?.[check]})` })
    : findings.push({ ...current, level: 'fail', check, detail });
const warn = (check: string, detail: string) => findings.push({ ...current, level: 'warn', check, detail });

// ---------- titles already taken ----------

const targetRecipes = targets.flatMap((f) => readBatch(f).recipes.map((r) => ({ file: basename(f), r })));
const targetIds = new Set(targetRecipes.map((x) => x.r.id));
type Known = { id: string; title: string; from: string; ingredientIds?: string[]; cuisine?: string };
const known: Known[] = [];
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as Recipe[];
for (const r of catalogue) {
  if (targetIds.has(r.id)) continue;
  const ingredientIds = r.ingredientGroups.flatMap((g) => g.items.flatMap((l) => (l.ingredientId ? [l.ingredientId] : [])));
  known.push({ id: r.id, title: r.title, from: 'catalogue', ingredientIds, cuisine: r.cuisine });
}
const knownIds = new Set(known.map((k) => k.id));
for (const f of batchFiles(root)) {
  if (targets.includes(f)) continue;
  for (const r of readBatch(f).recipes) if (!knownIds.has(r.id)) known.push({ id: r.id, title: r.title, from: basename(f) });
}
// batch-03 (parked branch, until it is merged) and the 12 Oct pilot: read-only, titles only.
if (!existsSync(join(root, HOUSE_DIR, 'batch-03.json')))
  try {
    const b3 = JSON.parse(
      execFileSync('git', ['show', 'house-recipes-batch-03:scripts/data/house-recipes/batch-03.json'], {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
      }).toString(),
    ) as { recipes: HouseRecipe[] };
    for (const r of b3.recipes) known.push({ id: r.id, title: r.title, from: 'batch-03 (parked)' });
  } catch {
    console.warn('(batch-03 branch not found: its titles are not checked)');
  }
const PILOT = join(process.env.HOME ?? '', 'Desktop/HQ/11-ThePantryV2/recipe-pilot-2026-10-12/recipes.json');
if (existsSync(PILOT))
  for (const r of JSON.parse(readFileSync(PILOT, 'utf8')) as { id: string; title: string }[])
    known.push({ id: `pilot:${r.id}`, title: r.title, from: 'pilot 12 Oct' });

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
const STOP = new Set(['with', 'and', 'the', 'a', 'an', 'of', 'in', 'on', 'style', 'easy', 'quick', 'simple', 'my', 'house']);
const titleWords = (t: string) => new Set(normaliseWords(t).filter((w) => !STOP.has(w)));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return a.size + b.size - inter ? inter / (a.size + b.size - inter) : 0;
};

// ---------- word lists ----------

/** Words in a line's text against the groups of the ingredient it matched (from batch-03, plus nuts and alcohol). */
const ALLERGENS: Record<string, { groups: IngredientGroup[]; words: RegExp; except?: RegExp }> = {
  gluten: {
    groups: ['gluten'],
    words:
      /\b(flour|bread|breadcrumbs?|panko|pasta|spaghetti|linguine|penne|fettuccine|rigatoni|macaroni|orzo|noodles?|soy sauce|shoyu|beer|couscous|bulgur|burghul|barley|rye|semolina|wheat|seitan|pastry|filo|phyllo|roti|naan|pita|tortillas?|dumpling wrappers?|wonton|malt|hoisin|oyster sauce|udon|ramen|freekeh|farro|spelt|crackers?|biscuits?|oats|miso|worcestershire|kecap)\b/i,
    except:
      /\b(rice flour|rice noodles?|glass noodles?|rice vermicelli|vermicelli rice|chickpea flour|besan|gram flour|tapioca flour|potato flour|cassava flour|coconut flour|almond flour|buckwheat( flour)?|prawn crackers?|corn tortillas?|masa|teff|sweet potato noodles?|mung bean noodles?|shirataki|gluten-free|tamari|rice paper|sorghum flour|millet flour|wattleseed flour|cooking the noodles)\b/gi,
  },
  dairy: {
    groups: ['dairy'],
    words:
      /\b(milk|butter|cream|cheese|yoghurt|yogurt|ghee|paneer|buttermilk|kefir|labneh|ricotta|feta|parmesan|mozzarella|custard|halloumi|mascarpone|curd|whey|crème fraîche|creme fraiche)\b/i,
    except:
      /\b(coconut milk|coconut cream|almond milk|oat milk|soy milk|soya milk|rice milk|peanut butter|nut butter|almond butter|cream of tartar|creamy|bean curd|cocoa butter|butter beans?|butternut|coconut yoghurt|soy yoghurt|butter lettuce|vegan butter|dairy-free \w+|plant-based \w+)\b/gi,
  },
  egg: {
    groups: ['egg'],
    words: /\b(eggs?|egg yolks?|egg whites?|yolks?|mayonnaise|mayo|aioli)\b/i,
    except: /\b(eggplants?|egg-free|eggless)\b/gi,
  },
  shellfish: {
    groups: ['shellfish'],
    words:
      /\b(prawns?|shrimps?|crabs?|lobsters?|mussels?|clams?|oysters?|scallops?|squid|calamari|octopus|crayfish|pipis?|shrimp paste|belacan|oyster sauce|cuttlefish)\b/i,
    except: /\b(oyster mushrooms?|mushroom oyster sauce|vegetarian oyster sauce)\b/gi,
  },
  fish: {
    groups: ['fish'],
    words:
      /\b(fish|salmon|tuna|anchov(y|ies)|sardines?|cod|snapper|barramundi|mackerel|trout|bonito|katsuobushi|dashi|fish sauce|worcestershire)\b/i,
    except: /\b(fish slice|kombu dashi)\b/gi,
  },
  soy: {
    groups: ['soy'],
    words: /\b(soy|soya|tofu|tempeh|miso|edamame|tamari|shoyu|kecap manis|natto|gochujang)\b/i,
    except: /\bsoy-free\b/gi,
  },
  sesame: { groups: ['sesame'], words: /\b(sesame|tahini|za'?atar|furikake)\b/i },
  'tree nuts': {
    groups: ['tree-nuts'],
    words: /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts?|brazil nuts?|almond meal)\b/i,
  },
  peanuts: { groups: ['peanuts'], words: /\b(peanuts?|peanut butter|satay)\b/i },
  alcohol: {
    groups: ['alcohol'],
    words: /\b(wine|beer|sake|mirin|rum|brandy|vodka|whisky|sherry|shaoxing|cider|marsala|port)\b/i,
    except: /\b(wine|sherry|cider|rice wine|malt) vinegar\b|\bnon-alcoholic \w+/gi,
  },
};

/** Not vegan, whatever the ingredient link says. */
const NOT_VEGAN =
  /\b(honey|gelatine?|fish sauce|anchov(y|ies)|worcestershire|shrimp paste|oyster sauce|bonito|katsuobushi|lard|suet|dripping|ghee|isinglass|carmine|cochineal|beeswax|egg|eggs|yolks?|mayonnaise|mayo|aioli|parmesan|pecorino|chicken stock|beef stock|fish stock)\b/i;
/** Hard cheeses usually made with animal rennet: not vegetarian under the conservative batch-04 rule unless the line says vegetarian. */
const HARD_CHEESE = /\b(parmesan|parmigiano|grana padano|pecorino|gruy[eè]re|comt[eé]|manchego|emmental|gorgonzola|roquefort)\b/i;
const VEG_RENNET = /\bvegetarian\b|\bnon-animal rennet\b|\bmicrobial rennet\b/i;

const MEAT_WORDS =
  /\b(chicken|pork|beef|lamb|veal|mince|pancetta|bacon|ham|sausages?|prosciutto|duck|steak|brisket|chorizo|salami|lard|gelatine?)\b/i;
const MEAT_EXCEPT = /\b(vegetarian sausages?|plant-based mince|mushroom mince|(fish|salmon|tuna|swordfish|cauliflower) steaks?)\b/gi;

// Food safety (Australian guidance): poultry and mince/sausages to 75°C, fresh pork to 70°C,
// whole cuts and braises carry a temperature, seafood a cooked-through cue.
const RAW_POULTRY = new Set(
  defs
    .filter((d) => d.groups.includes('poultry'))
    .map((d) => d.id)
    .filter((id) => !['cooked-chicken', 'duck-fat', 'pate', 'chicken-stock'].includes(id)),
);
const MINCE = new Set([
  'beef-mince',
  'lamb-mince',
  'pork-mince',
  'chicken-mince',
  'turkey-mince',
  'italian-sausage',
  'pork-sausage',
  'bratwurst',
]);
const FRESH_PORK = new Set(['pork-belly', 'pork-fillet', 'pork-loin', 'pork-shoulder', 'pork-ribs', 'pork-ear']);
const WHOLE_CUTS = new Set([
  'beef-eye-fillet',
  'beef-rib-eye',
  'beef-rump',
  'beef-sirloin',
  'beef-steak',
  'skirt-steak',
  'picanha',
  'lamb-cutlet',
  'veal-escalope',
  'beef-brisket',
  'beef-chuck',
  'beef-shin',
  'oxtail',
  'veal-shank',
  'lamb-shoulder',
  'lamb-leg',
  'beef-topside',
  'lamb-mince',
]);
const RAW_SEAFOOD = new Set([
  'salmon',
  'fresh-tuna',
  'white-fish',
  'calamari',
  'clams',
  'crab',
  'lobster',
  'mussels',
  'octopus',
  'prawn',
  'scallops',
]);
const RAW_EGG =
  /\b(raw (egg|yolk)s?|uncooked egg|steak tartare|eggnog|tiramisu|mousse|homemade (mayonnaise|mayo|aioli)|runny|jammy|soft-boiled|soft boiled|poach(ed)? eggs?|fried eggs?|just set)\b/i;

const COOK_VERB = /\b(cook|simmer|bake|roast|fry|boil|grill|steam|poach|sear|stir-fry|braise|toast|sauté|saute|char|brown)\b/i;
const CUE =
  /until|°C|opaque|no pink|flakes|springs? back|comes? out clean|bubbl|golden|tender|fragrant|translucent|\bset\b|thick|al dente|soft|crisp|darken|sizzl|wilt|reduced|glossy|melted|blister|caramel|charred|cooked through|puffed|risen|shimmer|smok/i;

const STYLE: [RegExp, string, 'fail' | 'warn'][] = [
  [/—/, 'em dash', 'fail'],
  [/–/, 'en dash (use "to")', 'warn'],
  [/\b\d+\s*°F\b|\bfahrenheit\b/i, 'Fahrenheit', 'fail'],
  [/\b\d+(\.\d+)?\s*(oz|ounces?|lbs?|pounds?|quarts?|pints?)\b|\bsticks? of butter\b/i, 'non-metric unit', 'fail'], // "pound the garlic" is a verb
  [/\bcups?\b/i, 'cup measure (fine if a 250ml metric cup, prefer g/ml)', 'warn'],
  [
    /\b(cilantro|scallions?|skillet|ground (beef|pork|lamb|chicken|turkey)|zucchinis|flavor|color|favorite|aluminum|broil(er)?|all-purpose flour|heavy cream|powdered sugar|confectioners|arugula|garbanzo|stovetop|cookie sheet|kosher salt)\b/i,
    'US term or spelling',
    'fail',
  ],
  [
    /\b(my (nan|nana|mum|mom|grand\w*|dad|family|wife|husband)|our family|back home|growing up|i grew up)\b/i,
    'invented persona story',
    'fail',
  ],
  [/\b(I|I'm|I've|I'd|we|we're|our)\b/, 'first person', 'fail'],
];

// ---------- nutrition: rough energy per 100 g (or ml) ----------

const KCAL: [RegExp, number][] = [
  [/stock|^water$|broth|water|vinegar|sauce|juice|^lemon$|^lime$/, 15],
  [/(^|-)oil$|olive-oil|oil-spray|^ghee$|lard|dripping|duck-fat/, 880],
  [/^butter$|vegan-butter/, 720],
  [/sugar|honey|syrup|golden-syrup|treacle|jam$/, 380],
  [/flour|cornflour|polenta|semolina|^oats|rolled-oats|bran/, 360],
  [/rice$|^rice|basmati|jasmine|arborio|quinoa|couscous|bulgur|barley|freekeh|farro|millet/, 355],
  [/pasta|spaghetti|penne|linguine|fettuccine|macaroni|orzo|lasagne|noodle|udon|soba|vermicelli|rigatoni/, 355],
  [/nut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|peanut|seed|tahini|sesame/, 590],
  [/chocolate|cocoa/, 520],
  [/coconut-cream/, 330],
  [/coconut-milk/, 190],
  [/^cream$|thickened-cream|double-cream|sour-cream|creme-fraiche|mascarpone|cream-cheese/, 340],
  [/cheese|parmesan|pecorino|cheddar|gruyere|manchego|halloumi|feta|mozzarella|ricotta|paneer/, 330],
  [/^milk$|full-cream-milk|oat-milk|soy-milk|almond-milk|buttermilk/, 55],
  [/yoghurt|yogurt|labneh|kefir/, 80],
  [/bacon|pancetta|chorizo|salami|guanciale|pork-belly|sausage|bratwurst|andouille|frankfurt|pepperoni/, 380],
  [/fillet|breast|loin|topside|rump|escalope/, 125],
  [/beef|lamb|pork|veal|oxtail|picanha|steak|mince|duck/, 220],
  [/chicken|turkey/, 170],
  [/salmon|tuna|trout|mackerel|sardine/, 190],
  [/fish|prawn|calamari|clam|mussel|octopus|scallop|crab|lobster|squid/, 100],
  [/tofu|tempeh/, 140],
  [/lentil|split-pea|dried-bean|dried-chickpea/, 340],
  [/bean|chickpea|lentils-tin|edamame/, 110],
  [/potato|sweet-potato|kumara|yam|taro|cassava|corn|parsnip/, 85],
  [/avocado/, 160],
  [/banana|date|raisin|sultana|dried|prune|fig/, 150],
  [/bread|wrap|tortilla|pita|naan|roll|bun|bagel|crumpet|brioche|panko|breadcrumb/, 270],
  [/curry-paste|paste$/, 150],
];
const AISLE_KCAL: Record<string, number> = {
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
  [/onion|shallot/, 130],
  [/garlic/, 5],
  [/potato|sweet-potato/, 200],
  [/carrot|zucchini|capsicum|tomato|apple|pear|banana|orange/, 140],
  [/asian-eggplant/, 150],
  [/eggplant|cauliflower|broccoli|cabbage|lettuce/, 400],
  [/lemon|lime/, 0],
  [/chilli|spring-onion|ginger|herb|coriander|basil|mint|parsley|thyme|rosemary|bay|lemongrass|kaffir|lime-leaves/, 0],
  [/avocado/, 150],
  [/chicken-thigh$/, 110],
  [/chicken-breast/, 220],
  [/fillet|steak/, 180],
  [/tortilla|wrap|pita|naan|roll|bun/, 60],
];
const ML_PER = { tsp: 5, tbsp: 15, cup: 250, ml: 1, l: 1000 } as const;
const DENSITY: [RegExp, number][] = [
  [/flour|cocoa|cornflour|oats|breadcrumb|panko/, 0.55],
  [/sugar/, 0.85],
  [/(^|-)oil$|olive-oil/, 0.92],
  [/honey|syrup/, 1.4],
];

function lineGrams(l: IngredientLine): number | undefined {
  if (l.quantity === undefined) return undefined;
  const q = typeof l.quantity === 'number' ? l.quantity : (l.quantity.min + l.quantity.max) / 2;
  const id = l.ingredientId ?? '';
  if (l.unit === 'g') return q;
  if (l.unit === 'kg') return q * 1000;
  if (l.unit && l.unit in ML_PER) {
    const dens = DENSITY.find(([re]) => re.test(id))?.[1] ?? 1;
    return q * ML_PER[l.unit as keyof typeof ML_PER] * dens;
  }
  if (l.unit === 'tin') return q * 400;
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

function kcalPer100(id: string): number {
  return KCAL.find(([re]) => re.test(id))?.[1] ?? AISLE_KCAL[def(id)?.aisle ?? 'other'] ?? 50;
}

// ---------- schema ----------

const KEYS = {
  required: [
    'id',
    'title',
    'summary',
    'cuisine',
    'mealTypes',
    'difficulty',
    'prepMinutes',
    'cookMinutes',
    'servings',
    'onePot',
    'diets',
    'ingredients',
    'steps',
  ],
  // author and generatedBy mark batch-03's ai-assisted recipes (house-recipes.mts checks them).
  optional: ['seasons', 'notes', 'provenance', 'image', 'nutrition', 'author', 'generatedBy'],
};
const NUTRITION_KEYS = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fibreG', 'sodiumMg'];
const isStrArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const oneOf = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v);

function checkSchema(h: Record<string, unknown>): boolean {
  let ok = true;
  const bad = (m: string) => {
    fail('schema', m);
    ok = false;
  };
  for (const k of KEYS.required) if (!(k in h)) bad(`missing "${k}"`);
  for (const k of Object.keys(h))
    if (![...KEYS.required, ...KEYS.optional].includes(k)) bad(`unknown field "${k}" (the app would drop it)`);
  for (const k of ['id', 'title', 'summary']) if (k in h && typeof h[k] !== 'string') bad(`"${k}" must be text`);
  if ('cuisine' in h && !oneOf(CUISINES, h.cuisine)) bad(`cuisine "${String(h.cuisine)}" is not one of the app's ${CUISINES.length}`);
  if ('difficulty' in h && !oneOf(DIFFICULTIES, h.difficulty)) bad(`difficulty "${String(h.difficulty)}"`);
  if ('mealTypes' in h && (!isStrArr(h.mealTypes) || !(h.mealTypes as string[]).every((m) => oneOf(MEAL_TYPES, m))))
    bad('mealTypes must be breakfast, lunch, dinner or snack');
  if ('diets' in h && (!isStrArr(h.diets) || !(h.diets as string[]).every((m) => oneOf(DIET_TAGS, m)))) bad('diets has an unknown tag');
  if ('seasons' in h && (!isStrArr(h.seasons) || !(h.seasons as string[]).every((m) => oneOf(SEASONS, m))))
    bad('seasons has an unknown season');
  for (const k of ['prepMinutes', 'cookMinutes', 'servings']) if (k in h && !Number.isInteger(h[k])) bad(`"${k}" must be a whole number`);
  if ('onePot' in h && typeof h.onePot !== 'boolean') bad('"onePot" must be true or false');
  if ('provenance' in h && h.provenance !== 'ai-draft' && h.provenance !== 'ai-assisted')
    bad('new recipes stay ai-draft (leave provenance out)');
  if ('steps' in h && !isStrArr(h.steps)) bad('steps must be a list of text');
  if ('notes' in h && !isStrArr(h.notes)) bad('notes must be a list of text');
  if ('ingredients' in h) {
    const groups = h.ingredients as unknown[];
    if (!Array.isArray(groups) || !groups.length) bad('ingredients must be a list of groups');
    else
      groups.forEach((g, i) => {
        const o = g as Record<string, unknown>;
        if (!isStrArr(o.items)) bad(`ingredients[${i}].items must be a list of lines`);
        for (const k of Object.keys(o)) if (!['section', 'items'].includes(k)) bad(`ingredients[${i}] has unknown field "${k}"`);
        if ('section' in o && typeof o.section !== 'string') bad(`ingredients[${i}].section must be text`);
      });
  }
  if ('image' in h) {
    const o = h.image as Record<string, unknown>;
    if (!o || Object.keys(o).sort().join() !== 'credit,key,source') bad('image must have exactly key, credit and source');
  }
  if ('nutrition' in h) {
    const o = h.nutrition as Record<string, unknown>;
    if (!o || Object.keys(o).sort().join() !== [...NUTRITION_KEYS].sort().join())
      bad(`nutrition must have exactly ${NUTRITION_KEYS.join(', ')}`);
    else
      for (const k of NUTRITION_KEYS)
        if (typeof o[k] !== 'number' || (o[k] as number) < 0) bad(`nutrition.${k} must be a number, 0 or more`);
  } else if (requireNutrition) fail('nutrition', 'no nutrition estimate');
  return ok;
}

// ---------- the checks ----------

function stepMinutes(text: string): { active: number; passive: number } {
  let active = 0;
  let passive = 0;
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  // Judge each time by its own sentence, so "bake for 50 minutes. Cool for 10" counts the bake as cooking.
  for (const sentence of text.split(/(?<=[.!?;])\s+/))
    for (const m of sentence.matchAll(re)) {
      const n = Number(m[2] ?? m[1]) * (/^h/i.test(m[3] ?? '') ? 60 : 1);
      const lead = sentence;
      if (
        /\b(marinat|soak|overnight|chill|refrigerat|fridge|rest|stand|proof|prove|rise(?!n)|cool|ferment|set aside|freez|up to|keeps?|lasts?)\w*/i.test(
          lead,
        )
      )
        passive += n;
      else active += n;
    }
  return { active, passive };
}

function checkRecipe(h: HouseRecipe, file: string, seen: Map<string, string>): void {
  current = { file, id: h.id ?? '(no id)' };
  if (!checkSchema(h as unknown as Record<string, unknown>)) return;

  // 1. The repo's own checks (house-recipes.mts + validateRecipe).
  const recipe = toRecipe(h, root, index, (m) => fail('repo', m.replace(`${h.id}: `, '')));
  for (const p of validateRecipe(recipe)) fail('repo', `${p.path} ${p.message}`);
  const lines = recipe.ingredientGroups.flatMap((g) => g.items);
  const ids = new Set(lines.flatMap((l) => (l.ingredientId ? [l.ingredientId] : [])));
  const diets = new Set(recipe.diets);
  const stated = new Set(h.diets);

  // 2. Duplicates: exact and near (60% of title words shared) against everything else, and inside the run.
  const n = norm(h.title);
  if (seen.has(n)) fail('duplicate', `same title as ${seen.get(n)} in this run`);
  seen.set(n, h.id);
  const tw = titleWords(h.title);
  for (const k of known) {
    if (norm(k.title) === n) fail('duplicate', `title already used by "${k.title}" (${k.from})`);
    else if (jaccard(tw, titleWords(k.title)) >= 0.6) fail('near-duplicate', `title close to "${k.title}" (${k.from})`);
    else if (k.ingredientIds && k.cuisine === h.cuisine && ids.size >= 5 && jaccard(ids, new Set(k.ingredientIds)) >= 0.75)
      warn('near-duplicate', `ingredients overlap 75%+ with "${k.title}" (${k.from})`);
  }

  // 3. Ingredient lines: one ingredient a line, alternatives that keep the tags, links that make sense.
  for (const l of lines) {
    const d = def(l.ingredientId);
    const outside = l.raw.replace(/\(([^)]*)\)/g, '').split(',')[0] ?? '';
    if (/\bor\b|[a-z]\s?\/\s?[a-z]/i.test(outside))
      fail('a-or-b', `"${l.raw}": one ingredient a line; put the alternative in brackets "(or ...)"`);
    if (d && d.aliases.some((a) => /\bor\b/.test(a) && normaliseWords(l.item).join(' ').includes(normaliseWords(a).join(' '))))
      fail('a-or-b', `"${l.raw}" matched ${d.id} through an "A or B" alias in the ingredient database`);
    for (const alt of (l.note ?? '')
      .split(';')
      .flatMap((part) => (/^\s*or\s+(.+)$/i.exec(part) ? [/^\s*or\s+(.+)$/i.exec(part)![1]!] : []))) {
      const altId = index.match(alt);
      if (!altId) {
        warn('alternative', `"${l.raw}": alternative "${alt}" is not in the ingredient database`);
        continue;
      }
      const altDiets = new Set(deriveDiets([{ ...l, ingredientId: altId, item: alt }, ...lines.filter((x) => x !== l)], index.byId));
      const lost = [...diets].filter((t) => !altDiets.has(t));
      if (lost.length)
        fail('alternative', `"${l.raw}": the alternative "${alt}" would break [${lost.join(', ')}]; drop it or note the tag change`);
    }
    if (d && l.ingredientId) {
      const itemWords = normaliseWords(l.item);
      const phrase = [d.name, ...d.aliases]
        .map((p) => normaliseWords(p))
        .filter((p) => p.every((w) => itemWords.includes(w)))
        .sort((a, b) => b.length - a.length)[0];
      if (phrase && phrase.length === 1 && itemWords.length >= 3)
        warn('link', `"${l.item}" linked to ${d.id} on the single word "${phrase[0]}"`);
    }
    // Allergens: what the line's words say against what its ingredient is tagged with.
    const groups = new Set(d?.groups ?? []);
    const words = `${l.item} ${outside}`;
    for (const [name, a] of Object.entries(ALLERGENS)) {
      const scrubbed = a.except ? words.replace(a.except, ' ') : words;
      const hit = a.words.exec(scrubbed);
      if (hit && !a.groups.some((g) => groups.has(g)))
        fail('allergen', `"${l.raw}" says ${name} ("${hit[0]}") but matched ${l.ingredientId ?? 'nothing'}, which isn't tagged ${name}`);
    }
  }

  // 4. Diet tags against the raw text, independent of the links (the pilot's second opinion).
  const counted = lines.filter((l) => !l.optional);
  const text = counted.map((l) => l.raw.replace(/\(([^)]*)\)/g, ' ')).join(' | ');
  const hits = (name: string) => {
    const a = ALLERGENS[name]!;
    return (a.except ? text.replace(a.except, ' ') : text).match(new RegExp(a.words.source, 'gi')) ?? [];
  };
  const meat = text.replace(MEAT_EXCEPT, ' ').match(new RegExp(MEAT_WORDS.source, 'gi')) ?? [];
  const sea = [...hits('fish'), ...hits('shellfish')];
  if (stated.has('vegetarian') && (meat.length || sea.length))
    fail('diet', `tagged vegetarian but the lines say ${[...meat, ...sea].slice(0, 3).join(', ')}`);
  if (stated.has('vegan')) {
    const m = text.replace(ALLERGENS.dairy!.except!, ' ').match(new RegExp(`${NOT_VEGAN.source}|${ALLERGENS.dairy!.words.source}`, 'gi'));
    if (m) fail('diet', `tagged vegan but the lines say ${[...new Set(m)].slice(0, 3).join(', ')}`);
  }
  if (stated.has('pescatarian') && meat.length) fail('diet', `tagged pescatarian but the lines say ${meat.slice(0, 3).join(', ')}`);
  if (stated.has('no-gluten') && hits('gluten').length)
    fail('diet', `tagged no-gluten but the lines say ${hits('gluten').slice(0, 3).join(', ')}`);
  if (stated.has('no-dairy') && hits('dairy').length)
    fail('diet', `tagged no-dairy but the lines say ${hits('dairy').slice(0, 3).join(', ')}`);
  if (diets.has('vegetarian') && HARD_CHEESE.test(text) && !counted.some((l) => HARD_CHEESE.test(l.raw) && VEG_RENNET.test(l.raw)))
    fail(
      'hard-cheese',
      `"${HARD_CHEESE.exec(text)?.[0]}" is usually made with animal rennet: not vegetarian (D-053). Use "vegetarian hard cheese" or drop it`,
    );

  // 5. Food safety.
  const method = [...h.steps, ...(h.notes ?? [])].join(' ');
  const safetyNote = (h.notes ?? []).some((x) => /^Food safety/.test(x));
  const need = (what: string, cue: RegExp, cueLabel: string) => {
    if (!safetyNote) fail('food-safety', `${what}: needs a note starting "Food safety"`);
    if (!cue.test(method)) fail('food-safety', `${what}: no ${cueLabel} in the steps or notes`);
  };
  if ([...ids].some((i) => RAW_POULTRY.has(i))) need('raw poultry', /75\s?°C/, '75°C');
  if ([...ids].some((i) => MINCE.has(i))) need('mince or sausage', /75\s?°C/, '75°C');
  if ([...ids].some((i) => FRESH_PORK.has(i))) need('fresh pork', /7[05]\s?°C/, '70°C (or 75°C)');
  if ([...ids].some((i) => WHOLE_CUTS.has(i) && !MINCE.has(i)))
    need('beef, lamb or veal cut', /\d\s?°C(?! oven)/, 'internal temperature in °C');
  if ([...ids].some((i) => RAW_SEAFOOD.has(i)))
    need('raw seafood', /opaque|flakes|63\s?°C|shells? (have |has )?open/i, 'opaque / flakes / 63°C cue');
  if (ids.has('egg') && RAW_EGG.test(method) && !safetyNote) fail('food-safety', 'raw or soft egg: needs a note starting "Food safety"');
  if (
    /\b(leftover|cooked and (cooled|chilled)|day-old) rice\b|\bfried rice\b/i.test(`${method} ${text} ${h.title}`) &&
    !/within (1|an|one) hour/i.test(method)
  )
    fail('food-safety', 'cooked rice: say to cool and refrigerate it within an hour');
  if (ids.has('kidney-beans') && /dried/i.test(text) && !/boil[^.]*10 min/i.test(method))
    fail('food-safety', 'dried kidney beans need a hard 10-minute boil');

  // 6. Times.
  const total = h.prepMinutes + h.cookMinutes;
  const { active, passive } = h.steps.reduce(
    (acc, s) => {
      const m = stepMinutes(s);
      return { active: acc.active + m.active, passive: acc.passive + m.passive };
    },
    { active: 0, passive: 0 },
  );
  if (h.cookMinutes === 0 && h.steps.some((s) => COOK_VERB.test(s) && !/\bno-cook\b/i.test(s)))
    warn('time', 'cookMinutes is 0 but a step cooks');
  if (active > total * 1.5 && active - total > 15) fail('time', `steps add up to about ${active} min but prep + cook is ${total} min`);
  else if (total > 30 && active > 0 && active * 4 < total && passive === 0)
    warn('time', `${total} min in all but the steps only account for about ${active} min`);
  if (passive >= 60 && total < passive)
    warn('time', `about ${passive} min of resting, marinating or chilling isn't in the time (house policy pending)`);
  if (h.cookMinutes > 0 && active > 0 && active < h.cookMinutes * 0.4 && h.cookMinutes > 20)
    warn('time', `cookMinutes ${h.cookMinutes} but the steps name only about ${active} min`);

  // 7. Servings and amounts.
  if (h.servings < 1 || h.servings > 12) fail('servings', `servings ${h.servings} (1 to 12 for house recipes)`);
  for (const l of lines) {
    const q = l.quantity === undefined ? undefined : typeof l.quantity === 'number' ? l.quantity : l.quantity.max;
    if (q === undefined) continue;
    const per = q / Math.max(1, h.servings);
    const odd =
      (l.unit === 'g' && (q > 4000 || per > 900)) ||
      (l.unit === 'kg' && (q > 4 || per > 0.9)) ||
      (l.unit === 'ml' && q > 4000) ||
      (l.unit === 'l' && q > 5) ||
      (l.unit === 'tsp' && q > 8) ||
      (l.unit === 'tbsp' && q > 16) ||
      (l.unit === 'cup' && q > 8) ||
      (l.unit === 'pinch' && q > 4) ||
      (l.unit === 'clove' && q > 30) ||
      (l.unit === undefined && q > 40);
    if (odd) fail('amounts', `"${l.raw}" looks large for ${h.servings} serving(s)`);
    if ((l.unit === 'g' || l.unit === 'ml') && q < 1) fail('amounts', `"${l.raw}" is under 1 ${l.unit}`);
    if (l.ingredientId === 'salt' && ((l.unit === 'tbsp' && q > 2) || (l.unit === 'tsp' && q > 4) || (l.unit === 'g' && q > 30)))
      fail('amounts', `a lot of salt: "${l.raw}"`);
    if (l.unit && ['oz', 'lb', 'fl-oz'].includes(l.unit)) fail('amounts', `"${l.raw}": use metric`);
  }
  if (lines.length < 3) fail('amounts', `only ${lines.length} ingredient line(s)`);

  // 8. Steps: readable, with a doneness cue on every cooking step.
  if (h.steps.length < 3 || h.steps.length > 14) fail('steps', `${h.steps.length} steps (3 to 14)`);
  h.steps.forEach((s, i) => {
    const label = `step ${i + 1}`;
    if (s.length < 25) fail('steps', `${label} is very short: "${s}"`);
    if (s.length > 600) fail('steps', `${label} is ${s.length} characters (split it)`);
    if (!/^[A-Z0-9]/.test(s)) fail('steps', `${label} should start with a capital`);
    if (!/[.!)]$/.test(s.trim())) fail('steps', `${label} should end with a full stop`);
    const long = s.split(/(?<=[.!?])\s+/).find((x) => x.split(/\s+/).length > 40);
    if (long) warn('steps', `${label} has a ${long.split(/\s+/).length}-word sentence`);
    const cooking = s.replace(/\bwhile [^,.]*|following the packet( instructions)?|as the packet says|the rest\b/gi, ' ');
    if (COOK_VERB.test(cooking) && !CUE.test(s)) {
      // A bare time is a weaker cue than something to look for: fine for eggs, rice and pasta, worth a glance elsewhere.
      if (/\d+\s*(minutes?|mins?|hours?)\b/i.test(s))
        warn('doneness', `${label} gives a time but nothing to look for: "${s.slice(0, 70)}..."`);
      else fail('doneness', `${label} cooks with no doneness cue: "${s.slice(0, 70)}..."`);
    }
  });
  if (!/until|°C/.test(h.steps.join(' '))) fail('doneness', 'no "until" or temperature cue anywhere in the method');
  if (h.summary && norm(h.summary) === norm(h.title)) fail('steps', 'summary just repeats the title');

  // 9. Style.
  const all = [h.title, h.summary, ...h.ingredients.flatMap((g) => g.items), ...h.steps, ...(h.notes ?? [])].join('\n');
  for (const [re, label, level] of STYLE) if (re.test(all)) (level === 'fail' ? fail : warn)('style', label);

  // 10. Nutrition: macros add up, sits in a sane range, and roughly matches the ingredients.
  const nu = h.nutrition;
  if (nu) {
    const fromMacros = 4 * nu.proteinG + 4 * nu.carbsG + 9 * nu.fatG + 2 * nu.fibreG;
    if (nu.kcal < 40 || nu.kcal > 1600) fail('nutrition', `${nu.kcal} kcal a serve is outside 40 to 1600`);
    if (Math.abs(fromMacros - nu.kcal) > Math.max(40, nu.kcal * 0.15))
      fail('nutrition', `protein, carbs, fat and fibre give ${Math.round(fromMacros)} kcal but kcal says ${nu.kcal}`);
    if (nu.sodiumMg > 3500) fail('nutrition', `${nu.sodiumMg} mg sodium a serve is very high`);
    if ([...ids].some((i) => /meat|seafood/.test(def(i)?.aisle ?? '') && !/stock|bones|fat|dripping/.test(i)) && nu.proteinG < 10)
      fail('nutrition', `has meat or seafood but only ${nu.proteinG} g protein a serve`);
    let known = 0;
    let kcal = 0;
    for (const l of counted) {
      const g = lineGrams(l);
      if (g === undefined || !l.ingredientId) continue;
      known++;
      kcal += (g * kcalPer100(l.ingredientId)) / 100;
    }
    const est = kcal / Math.max(1, h.servings);
    const cover = known / Math.max(1, counted.length);
    const ratio = nu.kcal / Math.max(1, est);
    if (cover >= 0.6 && est > 50 && (ratio < 0.55 || ratio > 1.8))
      fail('nutrition', `stated ${nu.kcal} kcal a serve but the ingredients come to roughly ${Math.round(est)}`);
    else if (est > 50 && (ratio < 0.55 || ratio > 1.8))
      warn('nutrition', `stated ${nu.kcal} kcal; a rough sum of ${known}/${counted.length} lines gives ${Math.round(est)}`);
  }
}

// ---------- run ----------

const seen = new Map<string, string>();
for (const { file, r } of targetRecipes) checkRecipe(r, file, seen);

const failed = new Set(findings.filter((f) => f.level === 'fail').map((f) => f.id));
const byCheck = (level: Finding['level']) =>
  Object.entries(
    findings
      .filter((f) => f.level === level)
      .reduce<Record<string, Set<string>>>((acc, f) => ((acc[f.check] ??= new Set()).add(f.id), acc), {}),
  )
    .sort((a, b) => b[1].size - a[1].size)
    .map(([k, s]) => `${k} ${s.size}`)
    .join(', ');
const out: string[] = [];
out.push(
  `Checked ${targetRecipes.length} recipe(s) in ${targets.map((f) => basename(f)).join(', ')} against ${known.length} existing titles.`,
);
for (const f of findings) out.push(`${f.level === 'fail' ? 'FAIL' : 'warn'}  ${f.id}  [${f.check}] ${f.detail}`);
out.push('');
out.push(`Recipes failing, by check: ${byCheck('fail') || 'none'}`);
out.push(`Recipes warned, by check: ${byCheck('warn') || 'none'}`);
out.push(
  `PASS ${targetRecipes.length - failed.size}/${targetRecipes.length}; ${findings.filter((f) => f.level === 'fail').length} failures, ${findings.filter((f) => f.level === 'warn').length} warnings`,
);
if (reportPath) writeFileSync(isAbsolute(reportPath) ? reportPath : join(process.cwd(), reportPath), `${out.join('\n')}\n`);
console.log(reportPath ? out.slice(-3).join('\n') : out.join('\n'));
if (failed.size) process.exitCode = 1;
