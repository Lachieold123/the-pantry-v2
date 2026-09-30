// Diets and the avoid list, worked out from what's actually in the
// ingredient list (via the ingredient database), never from a recipe's name.

import type { IngredientGroup, IngredientIndex } from '../ingredients/database';
import { normaliseWords } from '../ingredients/database';
import type { IngredientLine } from '../ingredients/types';
import { allLines, type DietTag, type Recipe } from './types';

const MEAT: readonly IngredientGroup[] = ['meat', 'beef', 'pork', 'lamb', 'poultry'];
const SEAFOOD: readonly IngredientGroup[] = ['fish', 'shellfish'];
const FLESH: readonly IngredientGroup[] = [...MEAT, ...SEAFOOD];
const ANIMAL_NOT_MEAT: readonly IngredientGroup[] = ['dairy', 'egg', 'animal-product'];

/** Words that name a whole group. A custom avoid word like "seafood" or "nuts" means the group. */
const GROUP_NAMES: Readonly<Record<string, readonly IngredientGroup[]>> = {
  meat: ['meat'],
  beef: ['beef'],
  pork: ['pork'],
  lamb: ['lamb'],
  poultry: ['poultry'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  seafood: ['fish', 'shellfish'],
  dairy: ['dairy'],
  egg: ['egg'],
  nut: ['tree-nuts', 'peanuts'],
  peanut: ['peanuts'],
  sesame: ['sesame'],
  soy: ['soy'],
  gluten: ['gluten'],
  chilli: ['chilli'],
  alcohol: ['alcohol'],
};

/**
 * Words that give away a group in a line the database doesn't recognise
 * ("pork scratchings", "pig's trotters and ham hock"). Broader than
 * GROUP_NAMES because an unknown line is all we have to go on.
 */
const TELLTALE_WORDS: Readonly<Record<string, readonly IngredientGroup[]>> = {
  ...GROUP_NAMES,
  ham: ['meat', 'pork'],
  bacon: ['meat', 'pork'],
  pig: ['meat', 'pork'],
  mutton: ['meat', 'lamb'],
  veal: ['meat', 'beef'],
  steak: ['meat', 'beef'],
  chicken: ['meat', 'poultry'],
  turkey: ['meat', 'poultry'],
  duck: ['meat', 'poultry'],
  prawn: ['shellfish'],
  shrimp: ['shellfish'],
  crab: ['shellfish'],
  anchovi: ['fish'],
  tuna: ['fish'],
  salmon: ['fish'],
  cheese: ['dairy'],
  milk: ['dairy'],
  cream: ['dairy'],
  wheat: ['gluten'],
  wine: ['alcohol'],
};

// hasOwn, so a line or word like "constructor" never reaches Object's prototype.
const lookUp = (table: Readonly<Record<string, readonly IngredientGroup[]>>, word: string) =>
  Object.hasOwn(table, word) ? (table[word] ?? []) : [];

function wordGroups(text: string, table: Readonly<Record<string, readonly IngredientGroup[]>>): IngredientGroup[] {
  return normaliseWords(text).flatMap((w) => lookUp(table, w));
}

type Options = { ids: string[]; unknown: string[] };
// Lines are immutable catalogue objects and matching isn't free, so each line is worked out once per database.
const optionCache = new WeakMap<IngredientIndex, WeakMap<object, Options>>();

/**
 * Every ingredient a line might mean. "400 g lamb or eggplant" is two
 * options, and the cook may use either, so diets and the avoid list check
 * both. A leading option borrows the last option's final word when that
 * names something else ("beef or lamb mince" is beef mince or lamb mince).
 * Options the database can't place are returned as text.
 */
export function lineOptions(line: Pick<IngredientLine, 'item' | 'ingredientId'>, index: IngredientIndex): Options {
  const cache = optionCache.get(index) ?? new WeakMap<object, Options>();
  optionCache.set(index, cache);
  const hit = cache.get(line);
  if (hit) return hit;
  const out = splitOptions(line, index);
  cache.set(line, out);
  return out;
}

function splitOptions(line: Pick<IngredientLine, 'item' | 'ingredientId'>, index: IngredientIndex): Options {
  const ids = line.ingredientId ? [line.ingredientId] : [];
  const options = line.item
    .split(/\s+or\s+/i)
    .map((o) => o.trim())
    .filter(Boolean);
  if (options.length < 2) return { ids, unknown: line.ingredientId ? [] : [line.item] };
  const last = options[options.length - 1] ?? '';
  const lastId = index.match(last);
  const tail = normaliseWords(last).at(-1);
  const unknown: string[] = [];
  options.forEach((option, i) => {
    let id = i === options.length - 1 ? lastId : undefined;
    if (i < options.length - 1) {
      const shared = tail ? index.match(`${option} ${tail}`) : undefined;
      id = shared !== undefined && shared !== lastId ? shared : index.match(option);
    }
    if (id) ids.push(id);
    else unknown.push(option);
  });
  return { ids: [...new Set(ids)], unknown };
}

/** The groups a line could put in the dish, across all its options, including tell-tale words in anything unrecognised. */
function lineGroups(line: IngredientLine, index: IngredientIndex): IngredientGroup[] {
  const { ids, unknown } = lineOptions(line, index);
  return [...ids.flatMap((id) => index.byId.get(id)?.groups ?? []), ...unknown.flatMap((t) => wordGroups(t, TELLTALE_WORDS))];
}

/**
 * Draft diet tags from the ingredients.
 * - A line naming options must fit the diet whichever option the cook picks.
 * - Optional lines don't count, except meat and seafood: "pancetta (optional)"
 *   still makes a dish unsuitable for a vegetarian (Lachlan, 30 Sep 2026).
 *   Cheeses made with rennet stay vegetarian, as recipe sites tag them.
 * - A required line with no database match makes every tag impossible,
 *   amount or not, because we can't vouch for what we can't identify.
 */
export function deriveDiets(lines: readonly IngredientLine[], index: IngredientIndex): DietTag[] {
  if (lines.some((l) => !l.optional && !l.ingredientId)) return [];
  const g = new Set<IngredientGroup>();
  for (const line of lines) {
    for (const group of lineGroups(line, index)) if (!line.optional || FLESH.includes(group)) g.add(group);
  }
  const has = (list: readonly IngredientGroup[]) => list.some((x) => g.has(x));
  const diets: DietTag[] = [];
  const meatFree = !has(MEAT);
  if (meatFree && !has(SEAFOOD)) diets.push('vegetarian');
  if (meatFree && !has(SEAFOOD) && !has(ANIMAL_NOT_MEAT)) diets.push('vegan');
  if (meatFree && has(SEAFOOD)) diets.push('pescatarian');
  if (!g.has('gluten')) diets.push('no-gluten');
  if (!g.has('dairy')) diets.push('no-dairy');
  return diets;
}

export type DietPreference = 'everything' | 'vegetarian' | 'vegan' | 'pescatarian';

export function fitsDietPreference(recipe: Pick<Recipe, 'diets'>, pref: DietPreference): boolean {
  switch (pref) {
    case 'everything':
      return true;
    case 'vegetarian':
      return recipe.diets.includes('vegetarian');
    case 'vegan':
      return recipe.diets.includes('vegan');
    case 'pescatarian':
      return recipe.diets.includes('vegetarian') || recipe.diets.includes('pescatarian');
  }
}

/** The fixed choices on the "Ingredients to avoid" screen, each covering a group of ingredients (D-006). */
export const AVOID_OPTIONS = {
  nuts: ['tree-nuts', 'peanuts'],
  shellfish: ['shellfish'],
  fish: ['fish'],
  pork: ['pork'],
  beef: ['beef'],
  lamb: ['lamb'],
  dairy: ['dairy'],
  eggs: ['egg'],
  gluten: ['gluten'],
  sesame: ['sesame'],
  soy: ['soy'],
  spicy: ['chilli'],
  alcohol: ['alcohol'],
} as const satisfies Record<string, readonly IngredientGroup[]>;
export type AvoidOption = keyof typeof AVOID_OPTIONS;

export type AvoidList = { options: AvoidOption[]; custom: string[] };

/** What a custom avoid word means: database ingredients, whole groups, and the words to look for in unrecognised lines. */
type CustomAvoid = { ids: ReadonlySet<string>; groups: readonly IngredientGroup[]; words: readonly string[] };

const resolved = new WeakMap<IngredientIndex, Map<string, CustomAvoid>>();

/**
 * An ingredient counts when one of its names starts or ends with the word:
 * "olive" covers kalamata olives and green olives, "chicken" covers chicken
 * thighs and chicken stock, "cheese" covers blue cheese and feta cheese. A
 * plain oil isn't the thing it's pressed from ("olive oil" isn't olives),
 * unless it's in a group (sesame oil, peanut oil). Names listing
 * alternatives ("beef or chicken stock") don't count.
 */
function resolveCustom(word: string, index: IngredientIndex): CustomAvoid {
  const cache = resolved.get(index) ?? new Map<string, CustomAvoid>();
  resolved.set(index, cache);
  const hit = cache.get(word);
  if (hit) return hit;
  const words = normaliseWords(word);
  const ids = new Set<string>();
  const n = words.length;
  if (n > 0) {
    for (const def of index.byId.values()) {
      const names = [def.name, ...def.aliases].map(normaliseWords);
      const covers = names.some((p) => {
        if (p.includes('or') || p.includes('and') || p.length < n) return false;
        const starts = words.every((w, i) => p[i] === w);
        const ends = words.every((w, i) => p[p.length - n + i] === w);
        const pressedOil = starts && !ends && p[n] === 'oil' && def.groups.length === 0;
        return (starts && !pressedOil) || ends;
      });
      if (covers) ids.add(def.id);
    }
  }
  const out: CustomAvoid = { ids, groups: n === 1 ? lookUp(GROUP_NAMES, words[0] ?? '') : [], words };
  cache.set(word, out);
  return out;
}

function containsWords(haystack: readonly string[], needle: readonly string[]): boolean {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/**
 * True when the recipe contains something the cook asked to avoid.
 * - Optional lines count too: we'd rather hide a dish than serve it with a caveat.
 * - Every option of an "X or Y" line counts: either could end up in the pot.
 * - Custom words match the database first (see resolveCustom). A line the
 *   database recognised as something else isn't word-matched, so "olives"
 *   leaves olive oil alone. Unrecognised lines are searched for the words,
 *   and for tell-tale words of an avoided group ("pork scratchings").
 */
export function containsAvoided(recipe: Pick<Recipe, 'ingredientGroups'>, avoid: AvoidList, index: IngredientIndex): boolean {
  const groups = new Set<IngredientGroup>(avoid.options.flatMap((o) => AVOID_OPTIONS[o]));
  const custom = avoid.custom.map((c) => resolveCustom(c, index)).filter((c) => c.words.length > 0);
  for (const c of custom) for (const g of c.groups) groups.add(g);
  const unheardOf = custom.filter((c) => c.ids.size === 0 && c.groups.length === 0);
  if (groups.size === 0 && custom.length === 0) return false;

  return allLines(recipe).some((line) => {
    const { ids, unknown } = lineOptions(line, index);
    for (const id of ids) {
      if (index.byId.get(id)?.groups.some((g) => groups.has(g))) return true;
      if (custom.some((c) => c.ids.has(id))) return true;
    }
    for (const text of unknown) {
      if (wordGroups(text, TELLTALE_WORDS).some((g) => groups.has(g))) return true;
      const words = normaliseWords(text);
      if (custom.some((c) => containsWords(words, c.words))) return true;
    }
    // A word the database has never heard of can only be looked for in the text.
    if (!unheardOf.length) return false;
    const words = normaliseWords(line.item);
    return unheardOf.some((c) => containsWords(words, c.words));
  });
}

/** How many of these recipes a custom avoid word would hide, so the settings screen can say so before it surprises anyone. */
export function avoidMatches(word: string, recipes: readonly Pick<Recipe, 'ingredientGroups'>[], index: IngredientIndex): number {
  const avoid: AvoidList = { options: [], custom: [word] };
  return recipes.filter((r) => containsAvoided(r, avoid, index)).length;
}

export type TasteRules = { diet: DietPreference; avoid: AvoidList };

/** The cook's hard rules in one place: every suggestion surface asks this, so none can forget the avoid list. */
export function fitsTaste(recipe: Pick<Recipe, 'diets' | 'ingredientGroups'>, taste: TasteRules, index: IngredientIndex): boolean {
  return fitsDietPreference(recipe, taste.diet) && !containsAvoided(recipe, taste.avoid, index);
}
