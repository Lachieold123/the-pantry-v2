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
  egg: /\b(eggs?|egg yolks?|mayonnaise|mayo|aioli)\b/,
  meat: /\b(chicken|pork|beef|lamb|mince|pancetta|bacon|ham|sausages?|prosciutto|chorizo|veal|duck|steak|brisket|lard|gelatine|gelatin|goat meat|mutton|salami)\b/,
  seafood:
    /\b(bonito|fish|salmon|tuna|prawns?|anchovy|anchovies|squid|mussels?|clams?|crab|oyster sauce|fish sauce|shrimp|dashi|worcestershire)\b/,
  gluten:
    /\b(flour|bread|breadcrumbs?|pasta|noodles?|spaghetti|macaroni|soy sauce|panko|couscous|bulgur|freekeh|semolina|oats|pita|pitta|tortillas?|flatbread|barley|worcestershire|miso|kecap manis|seitan|beer|wheat|rye|spelt|udon|ramen|soba|orzo|gnocchi|filo|puff pastry|pastry|croutons?)\b/,
  honey: /\bhoney\b/,
  'not-vegetarian': /\b(parmesan|parmigiano|pecorino|grana padano|gruy[eè]re|manchego|comt[eé]|fontina|gelatine|gelatin)\b/,
};

// Words that look like a family but aren't (coconut milk, rice noodles, vegetarian parmesan).
const NOT: Record<Family, RegExp> = {
  dairy:
    /\b(coconut|almond|oat|soy|soya|rice|cashew|plant|vegan|dairy-free) (milk|cream|yoghurt|yogurt|butter|cheese)\b|\bpeanut butter\b|\b(almond|cashew|nut|seed|apple) butter\b|cream of tartar|butter beans?|cocoa butter|\bbutternut\b|\bbutter lettuce\b|\bice cream\b(?= scoop)|\bcream crackers\b/,
  egg: /\beggplants?\b|\begg noodles?\b(?=.*\bvegan\b)|\bvegan mayo(nnaise)?\b|\begg-free\b/,
  meat: /\b(vegetable|vegetarian|vegan|mushroom|plant-based|meat-free|veggie|soy) (stock|mince|sausages?|chicken|bacon|broth|bouillon)\b|\b(fish|salmon|tuna|swordfish|cauliflower|mushroom) steaks?\b|\bham(?=s?hire)\b|\bchicken-of-the-woods\b|\bduck sauce\b|\bmince(d)? (garlic|ginger|onion|shallot)\b|\bfinely minced\b/,
  seafood: /\bvegan fish sauce\b|\bvegetarian (fish|oyster) sauce\b|\bmushroom oyster sauce\b|\boyster mushrooms?\b|\bfish-free\b/,
  gluten:
    /\b(rice|corn|maize|chickpea|gram|besan|tapioca|potato|almond|coconut|buckwheat|cassava|sorghum|gluten-free|gf|arrowroot|teff|millet|quinoa|banana|masa|chestnut|lentil|soy|sweet potato|mung bean|glutinous rice) (flour|noodles?|vermicelli|tortillas?|pasta|bread|starch|crackers|wrappers?|paper|flakes)\b|\brice paper\b|\bglass noodles?\b|\b(sweet potato|mung bean|kelp|shirataki|konjac|cellophane) noodles?\b|\bgluten-free\b|\bcorn tortillas?\b|\btortilla chips\b|\bcornflour\b|\bcornbread\b(?=.*gluten-free)|\btamari\b|\bbuckwheat\b|\bwheat-free\b|\bcoconut flour\b|\bflourless\b|\bglutinous\b|\bbread(ed)? with\b(?=.*gluten-free)/,
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
