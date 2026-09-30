// The ingredient database: one entry per thing you'd buy. Everything that
// needs to know "what is this line, really?" goes through here: aisles,
// cupboard matching, diets and the avoid list. Matching works on whole
// words, longest alias first, so "sweet potato" never counts as "potato".

export const AISLES = [
  'fruit-veg',
  'meat',
  'seafood',
  'deli',
  'dairy-eggs',
  'bakery',
  'pasta-rice-grains',
  'tins-jars',
  'sauces-oils',
  'herbs-spices',
  'baking',
  'asian-international',
  'nuts-dried',
  'frozen',
  'drinks',
  'other',
] as const;
export type AisleId = (typeof AISLES)[number];

/** Groups drive diets and the avoid list. An ingredient can be in several. */
export const INGREDIENT_GROUPS = [
  'meat', // any land animal flesh; always paired with a specific group below where known
  'beef',
  'pork',
  'lamb',
  'poultry',
  'fish',
  'shellfish',
  'dairy',
  'egg',
  'gluten',
  'tree-nuts',
  'peanuts',
  'sesame',
  'soy',
  'animal-product', // not meat but not vegan: honey, gelatine
  'alcohol',
  'chilli',
] as const;
export type IngredientGroup = (typeof INGREDIENT_GROUPS)[number];

export type IngredientDef = {
  id: string;
  /** Display name, singular, Australian English. */
  name: string;
  plural?: string;
  aisle: AisleId;
  /** Other ways recipes name it, lower case, singular. */
  aliases: string[];
  groups: IngredientGroup[];
  /** Assumed to be in every kitchen (D-010). */
  staple?: boolean;
};

export type IngredientIndex = {
  byId: ReadonlyMap<string, IngredientDef>;
  match: (item: string) => string | undefined;
};

/** Lower-case, strip accents and punctuation, and make each word singular-ish. */
export function normaliseWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(singular);
}

function singular(word: string): string {
  if (word.length <= 3) return word;
  // "-ies" and a final consonant + "y" both become "-i", so "chillies" meets
  // "chilli" and "berries" still meets "berry". The result is only ever
  // compared, never shown, so the odd spelling doesn't matter.
  if (word.endsWith('ies')) return `${word.slice(0, -3)}i`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}i`;
  if (/(ches|shes|sses|xes|oes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

export function buildIngredientIndex(defs: readonly IngredientDef[]): IngredientIndex {
  const byId = new Map<string, IngredientDef>();
  const phrases: { words: string[]; id: string }[] = [];
  // Two ingredients claiming the same phrase would make matching depend on
  // file order ("coconut vinegar" once resolved to cane vinegar), so it's a build error.
  const owner = new Map<string, string>();
  for (const def of defs) {
    if (byId.has(def.id)) throw new Error(`Duplicate ingredient id: ${def.id}`);
    byId.set(def.id, def);
    for (const phrase of [def.name, ...def.aliases]) {
      const words = normaliseWords(phrase);
      if (!words.length) continue;
      const key = words.join(' ');
      const claimed = owner.get(key);
      if (claimed !== undefined && claimed !== def.id) throw new Error(`"${phrase}" names both ${claimed} and ${def.id}`);
      owner.set(key, def.id);
      phrases.push({ words, id: def.id });
    }
  }
  // Longest phrase wins, so "sweet potato" beats "potato" and "coconut milk" beats "milk".
  phrases.sort((a, b) => b.words.length - a.words.length || b.words.join(' ').length - a.words.join(' ').length);

  const match = (item: string): string | undefined => {
    const words = normaliseWords(item);
    for (const phrase of phrases) {
      if (containsSequence(words, phrase.words)) return phrase.id;
    }
    return undefined;
  };
  return { byId, match };
}

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}
