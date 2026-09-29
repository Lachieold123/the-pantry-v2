// Search that forgives typos ("chiken" finds chicken) and filters that
// read only explicit recipe data.

import { normaliseWords } from '../ingredients/database';
import { fitsDietPreference, type DietPreference } from './diets';
import { totalMinutes, type CuisineId, type Difficulty, type MealType, type Recipe, type Season } from './types';

/** Edit distance with adjacent swaps counted as one edit ("chikcen"). Stops early past `limit`. */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) (rows[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const row = rows[i] as number[];
    const prev = rows[i - 1] as number[];
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, ((rows[i - 2] as number[])[j - 2] as number) + 1);
      }
      row[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > limit) return limit + 1;
  }
  return (rows[a.length] as number[])[b.length] as number;
}

/** Typos allowed for a word of this length: none for short words, where a typo is usually a different word. */
function allowedTypos(length: number): number {
  if (length < 4) return 0;
  if (length < 8) return 1;
  return 2;
}

function wordMatches(query: string, word: string): 'exact' | 'prefix' | 'fuzzy' | undefined {
  if (word === query) return 'exact';
  if (query.length >= 2 && word.startsWith(query)) return 'prefix';
  const typos = allowedTypos(query.length);
  if (typos > 0 && editDistance(query, word, typos) <= typos) return 'fuzzy';
  // Allow a typo inside a word still being typed: "chik" → "chicken".
  if (typos > 0 && word.length > query.length && editDistance(query, word.slice(0, query.length), typos) <= typos) return 'fuzzy';
  return undefined;
}

type Indexed = { recipe: Recipe; titleWords: string[]; otherWords: string[] };

export function indexForSearch(recipes: readonly Recipe[], cuisineLabel: (c: CuisineId) => string): Indexed[] {
  return recipes.map((recipe) => ({
    recipe,
    titleWords: normaliseWords(recipe.title),
    otherWords: normaliseWords(
      [cuisineLabel(recipe.cuisine), ...recipe.ingredientGroups.flatMap((g) => g.items.map((i) => i.item))].join(' '),
    ),
  }));
}

/**
 * Every query word must match somewhere. Title matches outrank ingredient
 * and cuisine matches; exact beats prefix beats typo. Ties keep catalogue order.
 */
export function searchRecipes(index: readonly Indexed[], query: string): Recipe[] {
  const words = normaliseWords(query);
  if (words.length === 0) return index.map((i) => i.recipe);
  const weight = { exact: 3, prefix: 2, fuzzy: 1 } as const;
  const scored: { recipe: Recipe; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    let score = 0;
    for (const q of words) {
      let best = 0;
      for (const w of entry.titleWords) {
        const m = wordMatches(q, w);
        if (m) best = Math.max(best, weight[m] * 10);
      }
      for (const w of entry.otherWords) {
        const m = wordMatches(q, w);
        if (m) best = Math.max(best, weight[m]);
      }
      if (best === 0) return;
      score += best;
    }
    scored.push({ recipe: entry.recipe, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.recipe);
}

export type TimeFilter = 'under-30' | 'under-45' | 'under-60' | 'over-60';

export type RecipeFilters = {
  cuisines: CuisineId[];
  diet: DietPreference;
  mealTypes: MealType[];
  time?: TimeFilter;
  difficulties: Difficulty[];
  onePot: boolean;
  inSeason?: Season;
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
