// Search that forgives typos ("chiken" finds chicken) and filters that
// read only explicit recipe data.

import { normaliseWords, type IngredientDef } from '../ingredients/database';
import { fitsDietPreference, type DietPreference } from './diets';
import { totalMinutes, type CuisineId, type Difficulty, type MealType, type Recipe, type Season } from './types';

/** Edit distance with adjacent swaps counted as one edit ("chikcen"). Stops early past `limit`. */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  // Three rolling rows (the swap rule looks two rows back) rather than a full
  // matrix: this can run thousands of times for one keystroke.
  let before = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    row[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (before[j - 2] as number) + 1);
      row[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    [before, prev, row] = [prev, row, before];
  }
  return prev[b.length] as number;
}

/** Typos allowed for a word of this length: none for short words, where a typo is usually a different word. */
function allowedTypos(length: number): number {
  if (length < 4) return 0;
  if (length < 8) return 1;
  return 2;
}

type Match = 'exact' | 'prefix' | 'fuzzy';

/**
 * Exact or prefix. The word being typed (the last one) prefix-matches from one
 * letter, so "c" and "chicken t" narrow the list instead of emptying it.
 * Finished words need two letters to count as a prefix.
 */
function strictMatch(query: string, word: string, typing: boolean): Match | undefined {
  if (word === query) return 'exact';
  if ((typing || query.length >= 2) && word.startsWith(query)) return 'prefix';
  return undefined;
}

function fuzzyMatch(query: string, word: string): Match | undefined {
  const typos = allowedTypos(query.length);
  if (typos === 0) return undefined;
  if (editDistance(query, word, typos) <= typos) return 'fuzzy';
  // Allow a typo inside a word still being typed: "chik" → "chicken".
  if (word.length > query.length && editDistance(query, word.slice(0, query.length), typos) <= typos) return 'fuzzy';
  return undefined;
}

// normaliseWords drops letters that don't decompose to a-z, so "smørrebrød"
// would become "sm rrebr d". Spell them out first.
const LETTERS: Record<string, string> = { ø: 'o', œ: 'oe', æ: 'ae', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th' };
function searchWords(text: string): string[] {
  return normaliseWords(text.toLowerCase().replace(/[øœæßłđðþ]/g, (c) => LETTERS[c] ?? c));
}

type Entry = { recipe: Recipe; titleWords: readonly string[]; otherWords: readonly string[]; synonyms: readonly string[] };

/** Built once per recipe list (the recipe book store shares one) and reused for every search. */
export type SearchIndex = { entries: readonly Entry[]; vocabulary: readonly string[] };

/**
 * One-word names for each line's ingredient from the database ("aubergine" for
 * eggplant). Multi-word aliases are left out because their words mislead on
 * their own: honey's "corn syrup or honey" would make every honey dish a corn dish.
 */
function synonymsFor(recipe: Recipe, ingredients: ReadonlyMap<string, IngredientDef> | undefined): string[] {
  const out: string[] = [];
  for (const line of recipe.ingredientGroups.flatMap((g) => g.items)) {
    const def = line.ingredientId ? ingredients?.get(line.ingredientId) : undefined;
    for (const name of def ? [def.name, ...def.aliases] : []) {
      const words = searchWords(name);
      if (words.length === 1) out.push(words[0] as string);
    }
  }
  return out;
}

/** `ingredients` (the database) lets a search use other names for an ingredient. */
export function indexForSearch(
  recipes: readonly Recipe[],
  cuisineLabel: (c: CuisineId) => string,
  ingredients?: ReadonlyMap<string, IngredientDef>,
): SearchIndex {
  const vocabulary = new Set<string>();
  const entries = recipes.map((recipe) => {
    const items = recipe.ingredientGroups.flatMap((g) => g.items.map((i) => i.item));
    const titleWords = [...new Set(searchWords(recipe.title))];
    const otherWords = [...new Set(searchWords([cuisineLabel(recipe.cuisine), ...items].join(' ')))];
    const seen = new Set([...titleWords, ...otherWords]);
    const synonyms = [...new Set(synonymsFor(recipe, ingredients))].filter((w) => !seen.has(w));
    for (const w of [...seen, ...synonyms]) vocabulary.add(w);
    return { recipe, titleWords, otherWords, synonyms };
  });
  return { entries, vocabulary: [...vocabulary] };
}

const WEIGHT: Record<Match, number> = { exact: 3, prefix: 2, fuzzy: 1 };

/**
 * How each query word matches every distinct word in the index, worked out
 * once per word rather than once per recipe. Typos only count for a query word
 * that matches nothing exactly or as a prefix (or when `forgiving`): otherwise
 * "corn" also finds "cordon" and "mint" puts Minestrone first.
 */
function matchTables(vocabulary: readonly string[], words: readonly string[], forgiving: boolean): Map<string, number>[] {
  return words.map((q, i) => {
    const typing = i === words.length - 1;
    const table = new Map<string, number>();
    for (const w of vocabulary) {
      const m = strictMatch(q, w, typing);
      if (m) table.set(w, WEIGHT[m]);
    }
    if (table.size === 0 || forgiving) {
      for (const w of vocabulary) {
        if (table.has(w)) continue;
        const m = fuzzyMatch(q, w);
        if (m) table.set(w, WEIGHT[m]);
      }
    }
    return table;
  });
}

function rank(index: SearchIndex, tables: readonly Map<string, number>[]): Recipe[] {
  const scored: { recipe: Recipe; score: number; order: number }[] = [];
  index.entries.forEach((entry, order) => {
    let score = 0;
    for (const table of tables) {
      let best = 0;
      for (const w of entry.titleWords) best = Math.max(best, (table.get(w) ?? 0) * 10);
      for (const w of entry.otherWords) best = Math.max(best, table.get(w) ?? 0);
      // Synonyms count only when typed in full: "corn" shouldn't find pickles by way of "cornichon".
      for (const w of entry.synonyms) if (table.get(w) === WEIGHT.exact) best = Math.max(best, WEIGHT.exact);
      if (best === 0) return;
      score += best;
    }
    scored.push({ recipe: entry.recipe, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.recipe);
}

/**
 * Every query word must match somewhere. Title matches outrank ingredient
 * and cuisine matches; exact beats prefix beats typo. Ties keep catalogue order.
 * A blank query returns everything; one of only symbols or emoji returns nothing.
 */
export function searchRecipes(index: SearchIndex, query: string): Recipe[] {
  const words = [...new Set(searchWords(query))];
  if (words.length === 0) return query.trim() ? [] : index.entries.map((e) => e.recipe);
  const results = rank(index, matchTables(index.vocabulary, words, false));
  if (results.length) return results;
  // No recipe has every word as typed. A misspelling can still be a real word
  // (or the start of one), which blocked its typo match above: try again with typos everywhere.
  return rank(index, matchTables(index.vocabulary, words, true));
}

export type TimeFilter = 'under-15' | 'under-30' | 'under-45' | 'under-60' | 'over-60';

export type RecipeFilters = {
  cuisines: CuisineId[];
  diet: DietPreference;
  mealTypes: MealType[];
  time?: TimeFilter | undefined;
  difficulties: Difficulty[];
  onePot: boolean;
  inSeason?: Season | undefined;
};

export const NO_FILTERS: RecipeFilters = { cuisines: [], diet: 'everything', mealTypes: [], difficulties: [], onePot: false };

export function countActiveFilters(f: RecipeFilters): number {
  return (
    (f.cuisines.length ? 1 : 0) +
    (f.diet !== 'everything' ? 1 : 0) +
    (f.mealTypes.length ? 1 : 0) +
    (f.time ? 1 : 0) +
    (f.difficulties.length ? 1 : 0) +
    (f.onePot ? 1 : 0) +
    (f.inSeason ? 1 : 0)
  );
}

function fitsTime(minutes: number, time: TimeFilter): boolean {
  switch (time) {
    case 'under-15':
      return minutes <= 15;
    case 'under-30':
      return minutes <= 30;
    case 'under-45':
      return minutes <= 45;
    case 'under-60':
      return minutes <= 60;
    case 'over-60':
      return minutes > 60;
  }
}

export function matchesFilters(recipe: Recipe, f: RecipeFilters): boolean {
  if (f.cuisines.length && !f.cuisines.includes(recipe.cuisine)) return false;
  if (!fitsDietPreference(recipe, f.diet)) return false;
  if (f.mealTypes.length && !f.mealTypes.some((m) => recipe.mealTypes.includes(m))) return false;
  if (f.time && !fitsTime(totalMinutes(recipe), f.time)) return false;
  if (f.difficulties.length && !f.difficulties.includes(recipe.difficulty)) return false;
  if (f.onePot && !recipe.onePot) return false;
  // Recipes with no season tag are year-round, so they always count as in season.
  if (f.inSeason && recipe.seasons && !recipe.seasons.includes(f.inSeason)) return false;
  return true;
}

/** Southern hemisphere, meteorological seasons (Dec–Feb is summer). */
export function seasonOn(date: Date): Season {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return 'summer';
  if (month <= 4) return 'autumn';
  if (month <= 7) return 'winter';
  return 'spring';
}
