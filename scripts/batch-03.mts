// Batch 03 (12 Oct 2026): turns the recipes the old Supabase generator
// published (a Claude Haiku pipeline, switched off on 12 Oct) into a house
// batch for the bundled catalogue. Nothing here talks to Supabase: it reads
// the read-only export in scripts/data/batch-03/.
//
//   npx tsx scripts/batch-03.mts
//
// What it does, in order:
//   1. drops recipes whose title is already in the catalogue;
//   2. credits every recipe to The Pantry, marks it `ai-assisted` and records
//      the model that wrote it (no fictional cooks);
//   3. applies the clear, mechanical fixes (spelling, em dashes, lines the
//      parser can't read) and the hand fixes in manual-fixes.json;
//   4. attaches a real photo (Pexels from the export, or Wikimedia Commons)
//      and never the generator's AI images;
//   5. checks every recipe (fields, units and amounts, steps and times,
//      allergens against the ingredients, food safety), adds the safety notes
//      that are clear-cut, and lists everything else for a person.
//
// Writes scripts/data/house-recipes/batch-03.json (read by house-recipes.mts
// like any batch) and scripts/data/batch-03/checks.json.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef, type IngredientGroup } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import { CUISINES, DIFFICULTIES, MEAL_TYPES, type CuisineId, type DietTag, type Recipe } from '../src/domain/recipes/types.ts';
import type { HouseRecipe } from './house-recipes.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'scripts/data/batch-03');
const read = <T,>(file: string, fallback?: T): T =>
  existsSync(join(dataDir, file)) ? (JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as T) : (fallback as T);

export const GENERATED_BY = 'claude-haiku-4-5-20251001';

type Line = { raw: string };
type Exported = {
  slug: string;
  title: string;
  cuisine: string;
  region: string;
  photo_source: 'ai' | 'pexels';
  recipe: {
    title: string;
    summary?: string;
    cuisine: string;
    diets: string[];
    mealTypes: string[];
    difficulty: string;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    onePot: boolean;
    seasons?: string[];
    ingredientGroups: { title?: string; items: Line[] }[];
    steps: { text: string }[];
    notes?: string[];
  };
};
type Photo = { id: string; credit: string; source: string };
type ManualFix = {
  why: string;
  summary?: string;
  notes?: string[];
  replace?: [string, string][];
  removeLines?: string[];
  cookMinutes?: number;
  prepMinutes?: number;
};

const rows = read<Exported[]>('published-recipes-2026-10-12.json');
const photos = new Map([...read<Photo[]>('pexels-photos.json', []), ...read<Photo[]>('commons-photos.json', [])].map((p) => [p.id, p]));
const manual = read<Record<string, ManualFix>>('manual-fixes.json', {});
const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as Recipe[];
const houseFile = join(root, 'scripts/data/house-recipes/batch-03.json');
// Titles from earlier batches count; this batch's own (from a previous rebuild) don't.
// BATCH03_ALL=1 checks every published row (duplicates too) for the Supabase feed and writes only checks-all.json.
const ALL = process.env.BATCH03_ALL === '1';
const takenTitles = ALL
  ? new Set<string>()
  : new Set(catalogue.filter((r) => r.provenance !== 'ai-assisted').map((r) => r.title.toLowerCase()));

// ---------- mechanical fixes ----------

/** Australian spelling and the house style (no em dashes). Whole words only. */
const SPELLING: [RegExp, string][] = [
  [/\bflavor/g, 'flavour'],
  [/\bFlavor/g, 'Flavour'],
  [/\bcolor/g, 'colour'],
  [/\bColor/g, 'Colour'],
  [/\bcenter/g, 'centre'],
  [/\bfavorite/g, 'favourite'],
  [/\byogurt/g, 'yoghurt'],
  [/\bYogurt/g, 'Yoghurt'],
  [/\bcilantro\b/g, 'coriander'],
  [/\bscallions?\b/g, 'spring onions'],
  [/\bbell peppers?\b/g, 'capsicum'],
  [/\bchiles\b/g, 'chillies'],
  [/\bchile\b/g, 'chilli'],
  [/\bgarbanzo beans\b/g, 'chickpeas'],
];
function house(text: string): string {
  let t = text.replace(/\s*—\s*/g, ', ').replace(/,\s*,/g, ',');
  for (const [from, to] of SPELLING) t = t.replace(from, to);
  return t;
}

/** Ingredient lines the parser can't read as written, reworded so it can. */
const LINE_FIXES: [RegExp, string][] = [
  [/^(\S+) whole cloves\b/, '$1 cloves (whole)'],
  [/^(\S+) curry leaves\b/, '$1 fresh curry leaves'],
  [/^(\S+) banana leaves\b/, '$1 sheets banana leaf'],
  [/^(\S+) vine leaves\b/, '$1 grape vine leaves'],
  [/^(\S+ ?\S*) vegetables \(/, '$1 mixed vegetables ('],
];
const SPECIAL_LINES: Record<string, string> = {
  '100 g mixed green and black olives, pitted': '100 g mixed olives (green and black), pitted',
  'Pickled daikon and carrot (optional)': 'Pickled vegetables (daikon and carrot) (optional)',
  '1 kg chicken bones and pieces (necks, wings, feet if you can get them)': '1 kg chicken bones (and pieces such as necks, wings and feet)',
  '1 tbsp gur (jaggery) or palm sugar (optional)': '1 tbsp jaggery (or palm sugar) (optional)',
  '3 tbsp crab paste (cua cốt) or additional crab meat': '3 tbsp crab paste (cua cốt, or more crab meat)',
  '800 g sea bream or white fish fillets (snapper or barramundi)': '800 g white fish fillets (sea bream, snapper or barramundi)',
};

/** The parser wants one ingredient per line, with any alternative in brackets (house style). */
function oneIngredient(t: string): string[] {
  const clean = (s: string) => {
    const { line, issues } = parseIngredientLine(s, index.match);
    return line.ingredientId !== undefined && !issues.includes('multiple-ingredients') && !issues.includes('no-ingredient-match');
  };
  if (clean(t) || !parseIngredientLine(t, index.match).issues.includes('multiple-ingredients')) return [t];
  if (SPECIAL_LINES[t]) return [SPECIAL_LINES[t]];
  // "Salt and white pepper, to taste" and other garnishes: one line each.
  const both = /^([A-Z][^,()]*?) and ([^,()]+?)(,? (?:to taste|to serve|to garnish|leaves picked).*)$/.exec(t);
  if (both) {
    const [, a = '', b = '', rest = ''] = both;
    const lines = [`${a}${rest}`, `${b.charAt(0).toUpperCase()}${b.slice(1)}${rest}`];
    if (lines.every(clean)) return lines;
  }
  // "1 litre chicken or vegetable stock" → "1 litre chicken stock (or vegetable stock)".
  const or = /^(.*?)\b([^\s(),][^(),]*?) or ([^(),]+?)((?:,| \().*)?$/.exec(t);
  if (or) {
    const [, lead = '', a = '', b = '', rest = ''] = or;
    const noun = b.trim().split(' ').slice(-1)[0] ?? '';
    // "chicken or vegetable stock" shares its noun; "spaghetti or linguine" doesn't. The noun is
    // borrowed only when that names a real ingredient that has the first word in its name.
    const lastWord = (a.trim().split(' ').slice(-1)[0] ?? '').toLowerCase();
    const sharedId = parseIngredientLine(`${lead}${a} ${noun}`, index.match).line.ingredientId;
    const sharedDef = sharedId ? index.byId.get(sharedId) : undefined;
    const shares =
      b.trim().includes(' ') &&
      lastWord !== noun.toLowerCase() &&
      lastWord !== 'water' &&
      sharedDef !== undefined &&
      sharedId !== parseIngredientLine(`${lead}${a}`, index.match).line.ingredientId &&
      [sharedDef.name, ...sharedDef.aliases].some((n) => n.toLowerCase().split(' ').includes(lastWord));
    const firsts = shares ? [`${a} ${noun}`, a] : [a];
    for (const first of firsts) {
      const candidate = `${lead}${first} (or ${b})${rest}`;
      if (clean(candidate)) return [candidate];
    }
  }
  return [t];
}

function fixLine(raw: string): string {
  let t = house(raw);
  for (const [from, to] of LINE_FIXES) t = t.replace(from, to);
  return oneIngredient(t).join('\n');
}

// ---------- checks ----------

type Issue = { id: string; title: string; kind: string; detail: string; fixed?: string };
const issues: Issue[] = [];

const ALLERGENS: Record<string, { groups: IngredientGroup[]; words: RegExp; except?: RegExp }> = {
  nuts: {
    groups: ['tree-nuts', 'peanuts'],
    words:
      /\b(almonds?|cashews?|peanuts?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts?|candlenuts?|groundnut|peanut butter|praline|satay|nut butter|nuts?)\b/i,
    except: /\b(nutmeg|coconut|doughnut|butternut|chestnut|water chestnut|tiger ?nut|nut-free|nutritional)\b/i,
  },
  gluten: {
    groups: ['gluten'],
    words:
      /\b(flour|bread|breadcrumbs?|panko|pasta|spaghetti|noodles?|soy sauce|shoyu|beer|couscous|bulgur|burghul|barley|rye|semolina|wheat|seitan|pastry|filo|phyllo|roti|naan|pita|tortillas?|dumpling wrappers?|wonton|malt|hoisin|oyster sauce|udon|ramen|freekeh|farro|spelt|crackers?|biscuits?)\b/i,
    except:
      /\b(rice flour|rice noodles?|glass noodles?|rice vermicelli|vermicelli rice|corn ?flour|cornflour|chickpea flour|besan|gram flour|tapioca flour|potato flour|cassava flour|coconut flour|almond flour|buckwheat|corn tortillas?|masa|teff|sweet potato noodles?|mung bean noodles?|shirataki|gluten-free|tamari|rice paper|kelp noodles|sorghum flour|millet flour|soba made from 100% buckwheat)\b/i,
  },
  dairy: {
    groups: ['dairy'],
    words:
      /\b(milk|butter|cream|cheese|yoghurt|ghee|paneer|buttermilk|kefir|labneh|ricotta|feta|parmesan|mozzarella|custard|halloumi|mascarpone|khoya|curd|condensed milk|whey|crème fraîche|creme fraiche)\b/i,
    except:
      /\b(coconut milk|coconut cream|almond milk|oat milk|soy milk|soya milk|rice milk|peanut butter|nut butter|cream of tartar|ice cream maker|creamy|creamed coconut|bean curd|cocoa butter|shea butter|butter beans?|butternut|milk powder-free|coconut yoghurt|plant-based|vegan butter|dairy-free)\b/i,
  },
  egg: {
    groups: ['egg'],
    words: /\b(eggs?|egg yolks?|egg whites?|yolks?|mayonnaise|mayo|aioli)\b/i,
    except: /\b(eggplants?|egg-free|eggless)\b/i,
  },
  shellfish: {
    groups: ['shellfish'],
    words:
      /\b(prawns?|shrimps?|crabs?|lobsters?|mussels?|clams?|oysters?|scallops?|squid|calamari|octopus|crayfish|crawfish|cockles?|pipis?|abalone|pāua|paua|kina|sea urchin|shrimp paste|belacan|terasi|bagoong|oyster sauce|cuttlefish)\b/i,
  },
  fish: {
    groups: ['fish'],
    words:
      /\b(fish|salmon|tuna|anchov(y|ies)|sardines?|cod|snapper|barramundi|mackerel|herring|trout|haddock|bonito|katsuobushi|dashi|fish sauce|worcestershire|ikan bilis|hilsa|tilapia|catfish|perch|sole|grouper|milkfish|snoek|saltfish|stockfish|roe|mentaiko|fish cake|chikuwa)\b/i,
    except: /\b(fish-shaped|fish slice|kingfish-free|fish kettle)\b/i,
  },
  soy: {
    groups: ['soy'],
    words:
      /\b(soy|soya|tofu|tempeh|miso|edamame|tamari|shoyu|kecap manis|hoisin|natto|bean curd|abura-?age|doubanjiang|gochujang|teriyaki)\b/i,
    except: /\b(soy-free)\b/i,
  },
  sesame: { groups: ['sesame'], words: /\b(sesame|tahini|gomasio|za'?atar|halva|halwa tahini|furikake)\b/i },
};

const lineGroups = (line: IngredientLine) => new Set(line.ingredientId ? (index.byId.get(line.ingredientId)?.groups ?? []) : []);

/** The minutes a step asks for, taking the top of any range ("8 to 10 minutes" is 10). */
function stepMinutes(text: string): { active: number; passive: number } {
  let active = 0;
  let passive = 0;
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  for (const m of text.matchAll(re)) {
    const n = Number(m[2] ?? m[1]) * (/^h/i.test(m[3] ?? '') ? 60 : 1);
    const before = text.slice(Math.max(0, (m.index ?? 0) - 90), m.index);
    const after = text.slice(m.index, (m.index ?? 0) + 60);
    const lead = `${before} ${after}`;
    if (
      /\b(marinat|soak|overnight|chill|refrigerat|fridge|rest|stand|proof|prove|rise|cool|ferment|set aside|leave it|freez|up to)\w*/i.test(
        lead,
      )
    )
      passive += n;
    else active += n;
  }
  return { active, passive };
}

const RAW_EGG =
  /\b(raw (egg|yolk)s?|raw egg yolks?|uncooked egg|crack (an|the|a raw) egg (over|into) (the )?(hot )?rice|tamago kake|steak tartare|yukhoe|eggnog|tiramisu|mousse|homemade (mayonnaise|mayo|aioli))\b/i;
const EGG_WARNED = /\b(raw or lightly cooked egg|pregnan|salmonella|pasteuri[sz]ed egg)/i;
const EGG_NOTE =
  'This uses raw or lightly cooked egg. Use fresh, clean, uncracked eggs (pasteurised if you can get them), keep it cold, and skip it for anyone pregnant, very young, elderly or with low immunity.';
const DONE_CUE =
  /(75\s?°C|70\s?°C|71\s?°C|63\s?°C|cooked through|no longer pink|no pink|juices run clear|until (it'?s |they'?re )?cooked|cooked all the way|fully cooked|internal temperature|falling apart|fall-apart|tender|fork-tender|meltingly)/i;
const FISH_NOTE =
  'The fish here is eaten raw or only cured in citrus. Buy sashimi-grade fish from a fishmonger, keep it cold and eat it the same day; skip it for anyone pregnant, very young, elderly or with low immunity.';
const CHICKEN_NOTE = 'Cook chicken until it reaches 75°C in the thickest part and the juices run clear.';
const MINCE_NOTE = 'Cook mince and sausages until they reach 75°C in the centre, with no pink left.';
const PORK_NOTE = 'Cook pork until it reaches at least 70°C in the thickest part (75°C for mince and sausages).';

function check(h: HouseRecipe, lines: IngredientLine[], supaDiets: string[]): void {
  const add = (kind: string, detail: string, fixed?: string) =>
    issues.push({ id: h.id, title: h.title, kind, detail, ...(fixed ? { fixed } : {}) });
  const text = [...h.steps, ...(h.notes ?? [])].join(' ');

  // Required fields.
  if (!h.summary?.trim()) add('fields', 'no summary');
  if (h.summary && h.summary.length > 120) add('fields', `summary is ${h.summary.length} characters (limit 120)`);
  if (!h.mealTypes.length) add('fields', 'no meal type');
  if (!(DIFFICULTIES as readonly string[]).includes(h.difficulty)) add('fields', `difficulty "${h.difficulty}"`);
  if (h.servings < 1 || h.servings > 20) add('fields', `servings ${h.servings}`);
  if (lines.length < 2) add('fields', `only ${lines.length} ingredient line(s)`);

  // Steps and time.
  if (h.steps.length < 2) add('steps', `only ${h.steps.length} step(s)`);
  if (h.steps.length > 16) add('steps', `${h.steps.length} steps`);
  if (h.steps.some((s) => s.length > 700)) add('steps', 'a step over 700 characters');
  if (h.prepMinutes <= 0) add('time', 'no prep time');
  const { active, passive } = h.steps.reduce(
    (acc, s) => {
      const m = stepMinutes(s);
      return { active: acc.active + m.active, passive: acc.passive + m.passive };
    },
    { active: 0, passive: 0 },
  );
  const total = h.prepMinutes + h.cookMinutes;
  // Steps often give alternatives ("slow cooker for 8 hours, or oven for 4"), so a long sum is only flagged, never "fixed".
  if (active > total * 1.5 && active - total > 15) {
    add('time', `steps add up to about ${active} min of cooking but the recipe says ${total} min in all (may count alternatives)`);
  } else if (total > 30 && active > 0 && active * 4 < total && passive === 0) {
    add('time', `says ${total} min in all but the steps only account for about ${active} min`);
  }
  if (passive >= 60 && h.prepMinutes + h.cookMinutes < passive)
    add('time', `needs about ${passive} min of marinating, soaking or chilling not counted in the time`);

  // Units and amounts.
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
    if (odd) add('amounts', `"${l.raw}" looks large for ${h.servings} serving(s)`);
    if ((l.unit === 'g' || l.unit === 'ml') && q > 0 && q < 1) add('amounts', `"${l.raw}" is under 1 ${l.unit}`);
    if (l.ingredientId === 'salt' && ((l.unit === 'tbsp' && q > 2) || (l.unit === 'tsp' && q > 4) || (l.unit === 'g' && q > 30)))
      add('amounts', `a lot of salt: "${l.raw}"`);
  }

  // Allergens: what the words in each line say against what the matched ingredient says.
  for (const l of lines) {
    const groups = lineGroups(l);
    const words = `${l.item} ${l.raw.replace(/\(([^)]*)\)/g, '').replace(/,.*$/, '')}`;
    for (const [name, a] of Object.entries(ALLERGENS)) {
      const hit = a.words.exec(words);
      if (!hit) continue;
      const scrubbed = a.except ? words.replace(new RegExp(a.except.source, 'gi'), '') : words;
      if (!a.words.test(scrubbed)) continue;
      if (a.groups.some((g) => groups.has(g))) continue;
      add('allergen', `"${l.raw}" mentions ${name} (${hit[0]}) but matched ${l.ingredientId ?? 'nothing'}, which isn't tagged ${name}`);
    }
  }
  // The diet tags the generator stored against what the app works out from the ingredients.
  const derived = new Set(deriveDiets(lines, index.byId));
  const claimed = supaDiets.filter((d) => !derived.has(d as DietTag));
  if (claimed.length)
    add(
      'diet-tags',
      `generator tagged it [${claimed.join(', ')}] but the ingredients don't support that`,
      'tags now worked out from the ingredients',
    );

  // Food safety.
  const groupsAll = new Set(lines.flatMap((l) => [...lineGroups(l)]));
  const ids = new Set(lines.map((l) => l.ingredientId ?? ''));
  const mince = [...ids].some((i) => /mince|sausage|bratwurst|frankfurt|chorizo|italian-sausage/.test(i));
  const notes = h.notes ?? (h.notes = []);
  if (groupsAll.has('poultry') && !DONE_CUE.test(text)) {
    notes.push(CHICKEN_NOTE);
    add('food-safety', 'chicken with no doneness cue', 'added a 75°C note');
  }
  if (mince && !/75\s?°C/.test(text + notes.join(' ')) && !/no (longer )?pink|cooked through|browned all over/i.test(text)) {
    notes.push(MINCE_NOTE);
    add('food-safety', 'mince or sausage with no doneness cue', 'added a 75°C note');
  }
  if (
    groupsAll.has('pork') &&
    !mince &&
    !DONE_CUE.test(text) &&
    ![...ids].every(
      (i) =>
        /bacon|ham|prosciutto|pancetta|salami|pepperoni|luncheon|guanciale|pork-crackling|roast-pork|nduja|pigs-blood/.test(i) ||
        !index.byId.get(i)?.groups.includes('pork'),
    )
  ) {
    notes.push(PORK_NOTE);
    add('food-safety', 'fresh pork with no doneness cue', 'added a 70°C note');
  }
  for (const s of h.steps) {
    const m = /\b(chicken|pork)\b[^.]*?\b(\d+)(?:\s*(?:–|-|to)\s*(\d+))?\s*min/i.exec(s);
    if (!m) continue;
    const mins = Number(m[3] ?? m[2]);
    const whole = /\bwhole (chicken|bird)|bone-in|drumsticks?|marylands?|legs?|shoulder|pork belly|ribs\b/i.test(s);
    if ((whole && mins < 20 && /roast|bake|simmer|braise|grill/i.test(s)) || (!whole && mins < 3 && /cook|fry|grill|sear/i.test(s)))
      add('food-safety', `short time for ${(m[1] ?? '').toLowerCase()}: "${s.slice(0, 140)}"`);
  }
  if (RAW_EGG.test(text) && !EGG_WARNED.test(text)) {
    notes.push(EGG_NOTE);
    add('food-safety', 'raw or lightly cooked egg', 'added a raw-egg note');
  }
  if (
    groupsAll.has('fish') &&
    (/\b(poke|ceviche|kinilaw|kokoda|ika mata|ota ika|crudo|tartare|sashimi)\b/i.test(h.title) ||
      /\b(raw fish|sashimi-grade|sashimi grade|cures? in the (lime|lemon|citrus)|lime juice will (cook|cure))\b/i.test(
        `${text} ${lines.map((l) => l.raw).join(' ')}`,
      )) &&
    !/pregnan/i.test(text) &&
    !/sashimi-grade[^.]*not needed/i.test(text)
  ) {
    notes.push(FISH_NOTE);
    add('food-safety', 'raw or citrus-cured fish', 'added a raw-fish note');
  }
  if (ids.has('kidney-beans') && /dried kidney/i.test(lines.map((l) => l.raw).join(' ')) && !/boil[^.]*10 min/i.test(text))
    add('food-safety', 'dried kidney beans without a hard 10-minute boil');
  if (/slow cooker/i.test(text) && /dried (red )?kidney/i.test(lines.map((l) => l.raw).join(' ')))
    add('food-safety', 'dried kidney beans in a slow cooker');
  if (!notes.length) delete h.notes;

  // Voice: these recipes come from The Pantry, not from a person.
  for (const t of [h.summary, ...h.steps, ...(h.notes ?? [])]) {
    if (
      /\b(my|I|I'm|I've|I'd|we|our|grandmother|grandma|nan|babcia|mum)\b/.test(t ?? '') &&
      !EGG_NOTE.includes(t ?? '') &&
      !/^Cook (chicken|mince|pork)/.test(t ?? '')
    )
      add('voice', `first-person or family story: "${(t ?? '').slice(0, 140)}"`);
  }
}

// ---------- convert ----------

const CUISINE_MAP: Record<string, CuisineId> = {};
const dropped: { id: string; title: string }[] = [];
const out: HouseRecipe[] = [];

for (const row of rows) {
  if (takenTitles.has(row.title.toLowerCase())) {
    dropped.push({ id: row.slug, title: row.title });
    continue;
  }
  const r = row.recipe;
  const fix = manual[row.slug];
  const cuisine = (CUISINE_MAP[r.cuisine] ?? r.cuisine) as CuisineId;
  if (!(CUISINES as readonly string[]).includes(cuisine)) throw new Error(`${row.slug}: unknown cuisine ${r.cuisine}`);

  let ingredients = r.ingredientGroups.map((g) => ({
    ...(g.title ? { section: house(g.title) } : {}),
    items: g.items.map((i) => fixLine(i.raw)).filter((raw) => !fix?.removeLines?.includes(raw)),
  }));
  let steps = r.steps.map((s) => house(s.text));
  let notes = (fix?.notes ?? r.notes ?? []).map(house);
  let summary = house(fix?.summary ?? r.summary ?? '');
  for (const [from, to] of fix?.replace ?? []) {
    const swap = (t: string) => t.split(from).join(to);
    ingredients = ingredients.map((g) => ({ ...g, items: g.items.map(swap).filter(Boolean) }));
    steps = steps.map(swap);
    notes = notes.map(swap).filter(Boolean);
    summary = swap(summary);
  }
  ingredients = ingredients.flatMap((g) =>
    g.items.flatMap((i) => i.split('\n')).length ? [{ ...g, items: g.items.flatMap((i) => i.split('\n')) }] : [],
  );

  const photo = photos.get(row.slug);
  const h: HouseRecipe = {
    id: row.slug,
    title: house(row.title),
    summary,
    cuisine,
    mealTypes: r.mealTypes.filter((m) => (MEAL_TYPES as readonly string[]).includes(m)) as HouseRecipe['mealTypes'],
    difficulty: r.difficulty as HouseRecipe['difficulty'],
    prepMinutes: fix?.prepMinutes ?? r.prepMinutes,
    cookMinutes: fix?.cookMinutes ?? r.cookMinutes,
    servings: r.servings,
    onePot: r.onePot,
    ...(r.seasons?.length ? { seasons: r.seasons as NonNullable<HouseRecipe['seasons']> } : {}),
    diets: [],
    ingredients,
    steps,
    ...(notes.length ? { notes } : {}),
    author: 'The Pantry',
    provenance: 'ai-assisted',
    generatedBy: GENERATED_BY,
    ...(photo ? { image: { key: row.slug, credit: photo.credit, source: photo.source } } : {}),
  };
  if (fix) issues.push({ id: h.id, title: h.title, kind: 'hand-fix', detail: fix.why, fixed: 'yes' });

  const lines = ingredients.flatMap((g) => g.items.map((raw) => parseIngredientLine(raw, index.match).line));
  for (const l of lines)
    if (!l.ingredientId) issues.push({ id: h.id, title: h.title, kind: 'ingredient', detail: `no ingredient match for "${l.raw}"` });
  check(h, lines, r.diets);
  h.diets = deriveDiets(lines, index.byId);
  out.push(h);
}

const batch = {
  about:
    'House recipes, batch 03 (12 October 2026): recipes written by an earlier AI pipeline (Claude Haiku) and imported from its Supabase export. Credited to The Pantry and labelled "AI-assisted recipe" in the app; no fictional cooks. Titles already in the catalogue were left out. Photos are the credited Pexels ones or Wikimedia Commons; the AI images were not used. Hidden in store builds until Lachlan signs them off. Made by scripts/batch-03.mts; do not edit by hand.',
  recipes: out,
};
if (!ALL) writeFileSync(houseFile, `${JSON.stringify(batch, null, 2)}\n`);
writeFileSync(
  join(dataDir, ALL ? 'checks-all.json' : 'checks.json'),
  `${JSON.stringify({ kept: out.length, dropped, issues }, null, 2)}\n`,
);

const tally = issues.reduce<Record<string, { found: number; fixed: number }>>((acc, i) => {
  const t = (acc[i.kind] ??= { found: 0, fixed: 0 });
  t.found += 1;
  if (i.fixed) t.fixed += 1;
  return acc;
}, {});
console.log(`Kept ${out.length}, dropped ${dropped.length} duplicate titles.`);
console.log(`Photos: ${out.filter((h) => h.image).length} of ${out.length}`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k}: ${v.found} found, ${v.fixed} fixed`);
