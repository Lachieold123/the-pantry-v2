// Checks a recipe's own words against its diet tags (from the 12 Oct pilot's
// checker, check_recipes.py). Diets are derived from linked ingredients, so a
// wrong link (a junk match, or "A or B" where only A is linked) can hand out a
// wrong "vegan" or "no-gluten". Reading the raw text as well catches that.
//
// Used by check-house-recipes.mts (house batches) and on the converted
// catalogue. Pure: takes text and tags, returns problems.

import type { DietTag } from '../src/domain/recipes/types.ts';

type Family = 'dairy' | 'egg' | 'meat' | 'seafood' | 'gluten' | 'honey' | 'not-vegetarian';

// Raw-text words that mean a family is present, whatever the ingredient link says.
const WORDS: Record<Family, RegExp> = {
  dairy:
    /\b(cheese|milk|butter|buttermilk|cream|ghee|yoghurt|yogurt|paneer|feta|parmesan|pecorino|mozzarella|ricotta|halloumi|mascarpone|labneh|kefir|custard)\b/,
  egg: /\b(eggs?|egg yolks?|mayonnaise|mayo|aioli|sponge|savoiardi|lady ?fingers?|brioche|pappardelle|tagliatelle)\b/,
  meat: /\b(chicken|pork|beef|lamb|mince|pancetta|bacon|ham|sausages?|prosciutto|chorizo|veal|duck|steak|brisket|lard|gelatine|gelatin|goat meat|mutton|salami|turkey|venison|kangaroo|rabbit|quail|boerewors|merguez|kransky|kielbasa|pepperoni|mortadella|guanciale|speck|bratwurst)\b/,
  seafood:
    /\b(bonito|fish|salmon|tuna|prawns?|anchovy|anchovies|squid|mussels?|clams?|crab|oyster sauce|fish sauce|shrimp|dashi|worcestershire|kingfish|yellowtail|cod|snapper|barramundi|trout|mackerel|sardines?|lobsters?|scallops?|octopus|calamari|bagoong|belacan|kimchi|(red|green|yellow|panang|massaman|jungle|thai) curry paste)\b/,
  gluten:
    /\b(flour|bread|breadcrumbs?|pasta|noodles?|spaghetti|macaroni|soy sauce|panko|couscous|bulgur|freekeh|semolina|oats|pita|pitta|tortillas?|flatbread|barley|worcestershire|miso|kecap manis|seitan|beer|wheat|rye|spelt|udon|ramen|soba|orzo|gnocchi|filo|puff pastry|pastry|croutons?|sponge|savoiardi|lady ?fingers?|cakes?|biscuits?|vermicelli|puffed rice|rice bubbles|corn ?flakes|paratha|roti|naan|black bean sauce|hoisin|shaoxing|stock cubes?|stock powder|malt|brioche)\b/,
  honey: /\bhoney\b/,
  'not-vegetarian': /\b(parmesan|parmigiano|pecorino|grana padano|gruy[eè]re|manchego|comt[eé]|fontina|gelatine|gelatin)\b/,
};

// Words that look like a family but aren't (coconut milk, rice noodles, vegetarian parmesan).
const NOT: Record<Family, RegExp> = {
  dairy:
    /\b(coconut|almond|oat|soy|soya|rice|cashew|plant|vegan|dairy-free) (milk|cream|yoghurt|yogurt|butter|cheese)\b|\bpeanut butter\b|\b(almond|cashew|nut|seed|apple) butter\b|cream of tartar|butter beans?|cocoa butter|\bbutternut\b|\bbutter lettuce\b|\bice cream\b(?= scoop)|\bcream crackers\b/,
  egg: /\beggplants?\b|\begg noodles?\b(?=.*\bvegan\b)|\bvegan mayo(nnaise)?\b|\begg-free\b|\b(egg-free|eggless|vegan|dried) (sponge|pappardelle|tagliatelle)\b|\bsponge (gourd|cloth)\b/,
  meat: /\b(vegetable|vegetarian|vegan|mushroom|plant-based|meat-free|veggie|soy) (stock|mince|sausages?|chicken|bacon|broth|bouillon|turkey|pepperoni|kransky)\b|\b(fish|salmon|tuna|swordfish|cauliflower|mushroom) steaks?\b|\bham(?=s?hire)\b|\bchicken-of-the-woods\b|\bduck sauce\b|\bmince(d)? (garlic|ginger|onion|shallot)\b|\bfinely minced\b|\bturkey berr(y|ies)\b/,
  seafood:
    /\bvegan fish sauce\b|\bvegetarian (fish|oyster) sauce\b|\bmushroom oyster sauce\b|\boyster mushrooms?\b|\bfish-free\b|\b(vegan|vegetarian|shrimp-free) (kimchi|(red|green|yellow|panang|massaman|jungle|thai) curry paste)\b/,
  gluten:
    /\b(?!corn ?flakes\b)(rice|corn|maize|chickpea|gram|besan|tapioca|potato|almond|coconut|buckwheat|cassava|sorghum|gluten-free|gf|arrowroot|teff|millet|quinoa|banana|masa|chestnut|lentil|soy|sweet potato|mung bean|glutinous rice) (?:(?:plain|self-raising|all-purpose) )?(flour|noodles?|vermicelli|tortillas?|pasta|bread|starch|crackers|wrappers?|paper|flakes)\b|\b(rice|corn|gluten-free|gf|sticky rice|mochi|tteok|nian|glutinous rice) (cakes?|biscuits?|sponge|breadcrumbs|stock cubes?|stock powder|cereal)\b|\bgluten-free (corn ?flakes|puffed rice|rice bubbles|hoisin|black bean sauce)\b|\b(rice|tapioca|bean|sweet potato|mung bean|glass) vermicelli\b|\bvermicelli rice\b|\bcupcake cases\b|\bcake (tins?|pans?)\b|\brice paper\b|\bglass noodles?\b|\b(sweet potato|mung bean|kelp|shirataki|konjac|cellophane) noodles?\b|\bgluten-free\b|\bcorn tortillas?\b|\btortilla chips\b|\bcornflour\b|\bcornbread\b(?=.*gluten-free)|\btamari\b|\bbuckwheat\b|\bwheat-free\b|\bcoconut flour\b|\bflourless\b|\bglutinous\b|\bbread(ed)? with\b(?=.*gluten-free)/,
  honey: /\bhoneydew\b|\bhoney ?comb\b(?= toffee)/,
  'not-vegetarian':
    /\bvegetarian (parmesan|pecorino|hard cheese|parmesan-style cheese|italian hard cheese|grana|gruy[eè]re)\b|\bparmesan-style cheese\b|\bvegetarian rennet\b|\bagar\b/,
};

const found = (family: Family, text: string): string[] => {
  const cleaned = text.replace(new RegExp(NOT[family].source, 'g'), ' ');
  return [...new Set(cleaned.match(new RegExp(WORDS[family].source, 'g')) ?? [])];
};

// Which raw-text families each tag rules out.
const RULES: [DietTag, Family[]][] = [
  ['vegan', ['dairy', 'egg', 'meat', 'seafood', 'honey', 'not-vegetarian']],
  ['vegetarian', ['meat', 'seafood', 'not-vegetarian']],
  ['pescatarian', ['meat']],
  ['no-gluten', ['gluten']],
  ['no-dairy', ['dairy']],
];

/**
 * Lines that name two different ingredients as "A or B" outside brackets
 * ("pancetta or bacon"): only one gets linked, so diets, the avoid list and the
 * shopping list can be wrong. "Fresh or dried noodles" (one ingredient) passes.
 */
export function orLines(items: readonly string[], match: (item: string) => string | undefined): string[] {
  return items.filter((raw) => {
    const item = raw
      .replace(/\([^)]*\)/g, ' ')
      .split(',')[0]!
      .toLowerCase();
    const parts = item.split(/\s(?:or|and\/or)\s/);
    if (parts.length < 2) return false;
    const ids = parts.map((p) => match(p.trim()));
    return ids.some((id, i) => id !== undefined && ids.some((other, j) => j !== i && other !== undefined && other !== id));
  });
}

/** Problems with the stated diets, read from the ingredient lines only (steps and notes may mention swaps). */
export function dietTextProblems(diets: readonly DietTag[], ingredientLines: readonly string[]): string[] {
  // Optional lines ("to serve, optional") are skipped, as deriveDiets does.
  const text = ingredientLines
    .filter((l) => !/\boptional\b/i.test(l))
    .join(' \n ')
    .toLowerCase();
  const out: string[] = [];
  for (const [tag, families] of RULES) {
    if (!diets.includes(tag)) continue;
    for (const f of families) {
      const words = found(f, text);
      if (words.length) out.push(`tagged ${tag} but the ingredients mention ${words.join(', ')} (${f})`);
    }
  }
  return out;
}

// ---------- claims in the recipe's own words (L7 FOOD-3) ----------

const CLAIMS: [string, RegExp, string[]][] = [
  ['gluten-free', /\bgluten[- ]free\b/i, ['gluten']],
  ['dairy-free', /\bdairy[- ]free\b/i, ['dairy']],
  ['egg-free', /\begg[- ]free\b/i, ['egg']],
  ['nut-free', /\bnut[- ]free\b/i, ['tree-nuts', 'peanuts']],
  ['vegan', /^(?:vegan\b|.*\b(?:is|naturally|fully|completely|and|a|an) vegan\b|.*,\s*vegan[.!]?$)/i, ['meat', 'fish', 'shellfish', 'dairy', 'egg', 'animal-product', 'non-vegetarian']],
  ['vegetarian', /^(?:vegetarian\b|.*\b(?:is|naturally|fully|and|a|an) vegetarian\b|.*,\s*vegetarian[.!]?$)/i, ['meat', 'fish', 'shellfish', 'non-vegetarian']],
];
// A sentence that offers a swap or a condition ("leave out the feta and it is vegan") isn't a plain claim.
const HEDGE =
  /n't|\bnot\b|\bnever\b|\bunless\b|\b(check|if|use|swap|make it|to make|for a|version|option|choose|look for|label|instead|replace|can be|could|substitut|leave out|skip|omit|without|serve (it )?(over|with))\b/i;

/** Plain diet claims in the title, summary or notes that a counted line's groups break ("Naturally vegan." over a honey line). */
export function claimProblems(texts: readonly string[], groups: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const sentence of texts.flatMap((t) => t.split(/(?<=[.!?])\s+/)))
    for (const [claim, rx, breaks] of CLAIMS)
      if (rx.test(sentence) && !HEDGE.test(sentence) && breaks.some((g) => groups.has(g)))
        out.push(`says "${claim}" ("${sentence.slice(0, 80)}") but a line carries ${breaks.filter((g) => groups.has(g)).join(', ')}`);
  return out;
}

// ---------- "Contains ..." notes (L7 FOOD-12) ----------

// The allergen groups a "Contains" note must name, with the words that count as naming it.
const ALLERGEN_WORDS: [string, string, RegExp][] = [
  ['gluten', 'gluten', /gluten|wheat/i],
  ['dairy', 'milk', /dairy|milk|lactose/i],
  ['egg', 'egg', /\begg/i],
  ['soy', 'soy', /\bsoy/i],
  ['sesame', 'sesame', /sesame/i],
  ['fish', 'fish', /\bfish\b/i],
  ['shellfish', 'shellfish', /shellfish|crustacea|mollusc|prawn|shrimp/i],
  ['tree-nuts', 'tree nuts', /tree nuts?|\bnuts\b|almond|cashew|walnut|pistachio|hazelnut|pecan|macadamia|pine nut/i],
  ['peanuts', 'peanuts', /peanut/i],
];
const CONTAINS = /\bContains (?!no\b|none\b)([^.;]+)([.;]|$)/;

/** A "Contains ..." sentence that leaves out an allergen its counted lines carry, with the sentence it should be. */
export function containsGaps(notes: readonly string[], groups: ReadonlySet<string>): { note: string; from: string; to: string; missing: string[] }[] {
  const out: { note: string; from: string; to: string; missing: string[] }[] = [];
  for (const note of notes) {
    const m = CONTAINS.exec(note);
    if (!m) continue;
    const listed = m[1]!;
    const missing = ALLERGEN_WORDS.filter(([g, , rx]) => groups.has(g) && !rx.test(listed)).map(([, word]) => word);
    if (!missing.length) continue;
    const words = [...listed.split(/,\s*|\s+and\s+/).map((w) => w.trim()).filter(Boolean), ...missing];
    const list = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0]!;
    out.push({ note, from: m[0], to: `Contains ${list}${m[2] || '.'}`, missing });
  }
  return out;
}

// ---------- find-and-replace damage (L7 FOOD-11) ----------

// "<word>-free" that is a real diet or method word; anything else ("Pandan-Free", "parsnip-free onion") is bulk-edit damage.
const FREE_OK =
  /^(gluten|dairy|egg|nut|sugar|fat|soy|lactose|meat|wheat|grain|oil|alcohol|caffeine|peanut|sesame|shellfish|fish|hands|cruelty|salt|bpa|stress|mess|fuss|knead|bake|no-bake|carb|refined-sugar|seed|allergen|tree-nut|corn|oven|grease|lump|pressure|hands-free|stick|nightshade|yeast|guilt|ice|frost|chemical|preservative|msg|clump|vegan|animal|top8|onion|garlic|cheese|mayo|mayonnaise|flour)$/;

/** "<x>-free" words that aren't diet or method words: the mark of a find-and-replace that ran over food names. */
export function artefactProblems(texts: readonly string[]): string[] {
  const words = texts.flatMap((t) => [...t.toLowerCase().matchAll(/\b([a-z]+)-free\b/g)].filter((m) => !FREE_OK.test(m[1]!)).map((m) => m[0]));
  return [...new Set(words)].map((w) => `"${w}" looks like find-and-replace damage`);
}

// ---------- food safety (Australian guidance: FSANZ, Food Safety Information Council) ----------
// Poultry, mince, sausages and rolled or stuffed meats to 75°C; fresh pork to 70°C; whole cuts carry a
// temperature; seafood a cooked-through cue; cooked rice cooled and refrigerated quickly; dried red kidney
// beans boiled hard for 10 minutes; raw or lightly cooked egg and raw seafood name the people who should
// avoid them; no honey for babies under 12 months; garlic or chilli in oil kept in the fridge.

export const MINCE = new Set(['beef-mince', 'lamb-mince', 'pork-mince', 'chicken-mince', 'turkey-mince', 'italian-sausage', 'pork-sausage', 'bratwurst']);
const NOT_RAW_POULTRY = new Set(['cooked-chicken', 'duck-fat', 'pate', 'chicken-stock', 'chicken-stock-cube']);
const FRESH_PORK = new Set(['pork-belly', 'pork-fillet', 'pork-loin', 'pork-shoulder', 'pork-ribs', 'pork-ear', 'pork-heart', 'pork-liver']);
const WHOLE_CUTS = new Set([
  'beef-eye-fillet', 'beef-rib-eye', 'beef-rump', 'beef-sirloin', 'beef-steak', 'skirt-steak', 'picanha', 'lamb-cutlet', 'veal-escalope',
  'beef-brisket', 'beef-chuck', 'beef-shin', 'oxtail', 'veal-shank', 'lamb-shoulder', 'lamb-leg', 'beef-topside',
]);
const RAW_SEAFOOD = new Set(['salmon', 'fresh-tuna', 'white-fish', 'kingfish', 'calamari', 'clams', 'crab', 'lobster', 'mussels', 'octopus', 'prawn', 'scallops']);
export const RAW_EGG =
  // Egg eaten raw or soft. A bare "raw egg" is usually mixed in and then baked or fried, so it doesn't count;
  // "runny" and "jammy" count only about the egg (not honey, icing or tomatoes cooked down).
  /\b(uses? raw (egg|yolk)s?|served raw|uncooked egg|steak tartare|eggnog|tiramisu|mousse|homemade (mayonnaise|mayo|aioli)|hollandaise|zabaglione|soft[- ](yolk|egg)s?|runny (yolk|egg)s?|yolks?[^.]{0,30}\brunny|(eggs?|yolks?)[^.]{0,40}\bjammy|jammy (egg|yolk)s?|soft-boiled|soft boiled|poach(ed)? eggs?|fried eggs?|just set but still|just set and creamy)\b/i;
// "no runny yolk" and "until the yolks are no longer runny" name the egg but say it is cooked.
export const NOT_RAW_EGG = /\b(no|not eat|no longer)\b[^.;]{0,25}\b(raw (egg|yolk)s?|runny)\b/gi;
const VULNERABLE = /pregnan|vulnerable|immun|pasteuri/i;
const RAW_FISH_DISH =
  /\b(ceviche|sashimi|poke|crudo|tartare|carpaccio|kinilaw|kokoda|gravlax|tiradito|hoe|yusheng|raw (fish|salmon|tuna|kingfish|oysters?|prawns?)|oysters natural|natural oysters)\b/i;
const OIL_INFUSION = /\b(garlic|chilli|chili|herb)[- ](infused )?oil\b|\bconfit garlic\b|\bgarlic confit\b/i;
// A "Food safety" note must say something: a temperature, a cue or a storage rule, not just the prefix.
const SAFETY_SAYS =
  /\d\s?°C|cook|heat|reheat|fridge|refrigerat|chill|cool|steaming|pregnan|vulnerable|immun|wash|boil|raw|soak|store|keep|discard|thaw|opaque|flake|egg|rinse|label|hot|pink|juices|alive|fresh|months/i;
// "does not need to reach 75°C" mentions the number but says the opposite.
const NOT_75 = /\b(not|n't|no need to|never)\b[^.]{0,40}\b75\s?°C/i;

export type SafetyInput = {
  ids: ReadonlySet<string>;
  isPoultry: (id: string) => boolean;
  lineText: string;
  title: string;
  summary: string;
  steps: readonly string[];
  notes: readonly string[];
};

/** Food-safety problems for one recipe (the checks validate-house-recipes.mts runs on every recipe, house or converted). */
export function safetyProblems(r: SafetyInput): string[] {
  const out: string[] = [];
  const method = [...r.steps, ...r.notes].join(' ');
  const all = `${r.title} ${r.summary} ${method}`;
  const safetyNotes = r.notes.filter((n) => /^Food safety/.test(n));
  for (const n of safetyNotes) if (!SAFETY_SAYS.test(n.replace(/^Food safety:?/, ''))) out.push(`the "Food safety" note says nothing: "${n}"`);
  const safetyNote = safetyNotes.some((n) => SAFETY_SAYS.test(n.replace(/^Food safety:?/, '')));
  const need = (what: string, cue: RegExp, cueLabel: string) => {
    if (!safetyNote) out.push(`${what}: needs a note starting "Food safety"`);
    if (!cue.test(method)) out.push(`${what}: no ${cueLabel} in the steps or notes`);
  };
  const ids = [...r.ids];
  const has75 = /75\s?°C/;
  if (NOT_75.test(method)) out.push('a step or note says the meat need not reach 75°C');
  if (ids.some((i) => r.isPoultry(i) && !NOT_RAW_POULTRY.has(i))) need('raw poultry', has75, '75°C');
  if (ids.some((i) => MINCE.has(i))) need('mince or sausage', has75, '75°C');
  if (ids.some((i) => FRESH_PORK.has(i))) need('fresh pork', /7[05]\s?°C/, '70°C (or 75°C)');
  if (ids.some((i) => WHOLE_CUTS.has(i))) need('beef, lamb or veal cut', /\d\s?°C(?! oven)/, 'internal temperature in °C');
  // The dish's name and summary only: steps "poke holes", and tartare sauce isn't raw fish.
  // A raw-fish name needs raw seafood in the lines too (a tofu poke bowl isn't one), and tartare sauce or dip isn't raw fish.
  const rawFish = (ids.some((i) => RAW_SEAFOOD.has(i)) || /oyster/i.test(r.lineText)) &&
    RAW_FISH_DISH.test(`${r.title} ${r.summary}`.replace(/\b(yoghurt |yogurt )?tartare? (sauce|dip|mayo)\b|\byog(h)?urt tartare\b/gi, ' '));
  if (ids.some((i) => RAW_SEAFOOD.has(i)) && !rawFish) need('raw seafood', /opaque|flakes|63\s?°C|shells? (have |has )?open/i, 'opaque / flakes / 63°C cue');
  if (rawFish && !VULNERABLE.test(method)) out.push('raw or lightly cured seafood: say who should avoid it (pregnant women, young children, older people, low immunity)');
  if (r.ids.has('egg') && RAW_EGG.test(method.replace(NOT_RAW_EGG, ' '))) {
    if (!safetyNote) out.push('raw or soft egg: needs a note starting "Food safety"');
    else if (!VULNERABLE.test(method)) out.push('raw or soft egg: the note should say who should avoid it (pregnant women, young children, older people, low immunity)');
  }
  if (/\b(leftover|cooked and (cooled|chilled)|day-old) rice\b|\bfried rice\b/i.test(`${method} ${r.lineText} ${r.title}`) && !/within (1|an|one) hour/i.test(method))
    out.push('cooked rice: say to cool and refrigerate it within an hour');
  if (r.ids.has('kidney-beans') && /dried/i.test(r.lineText) && !/boil[^.]*10 min/i.test(method)) out.push('dried kidney beans need a hard 10-minute boil');
  // A dish meant for a baby ("for babies from 6 months"), not baby spinach or "keeps 3 months".
  const forBaby = /\b(for (your |the )?(baby|babies)|babies|baby food|baby-led|infants?|toddlers?|from \d+ months|\d+\s*months? old)\b/i;
  if (/\bhoney\b/i.test(r.lineText) && forBaby.test(all) && !/12 months|under (1|one) year/i.test(all))
    out.push('honey in a dish for babies: say no honey under 12 months');
  if (OIL_INFUSION.test(`${r.title} ${r.summary}`) && !/fridge|refrigerat/i.test(method)) out.push('garlic or chilli in oil: say to keep it in the fridge and use it within days');
  if (/\breheat/i.test(method) && !/steaming hot|piping hot|75\s?°C/i.test(method)) out.push('reheating: say to reheat until steaming hot');
  return out;
}
