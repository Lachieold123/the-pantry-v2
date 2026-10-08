// Search that forgives typos ("chiken" finds chicken) and filters that
// read only explicit recipe data.

import { normaliseWords, type IngredientIndex } from '../ingredients/database';
import { spellings, wordMatches } from './searchWords';
import { fitsDietPreference, type DietPreference } from './diets';
import { totalMinutes, type CuisineId, type Difficulty, type MealType, type Recipe, type Season } from './types';

type Indexed = { recipe: Recipe; titleWords: string[]; otherWords: string[] };

/**
 * Each recipe's words: the title, then the cuisine, the ingredient lines and
 * (given the ingredient database) each ingredient's name and aliases, so
 * "shrimp" finds prawn dishes (BUG-14).
 */
export function indexForSearch(
  recipes: readonly Recipe[],
  cuisineLabel: (c: CuisineId) => string,
  ingredients?: IngredientIndex,
): Indexed[] {
  const known = (id: string | undefined) => {
    const def = id ? ingredients?.byId.get(id) : undefined;
    return def ? [def.name, ...def.aliases] : [];
  };
  const index = recipes.map((recipe) => {
    const lines = recipe.ingredientGroups.flatMap((g) => g.items);
    return {
      recipe,
      titleWords: normaliseWords(recipe.title),
      otherWords: [
        ...new Set(normaliseWords([cuisineLabel(recipe.cuisine), ...lines.flatMap((i) => [i.item, ...known(i.ingredientId)])].join(' '))),
      ],
    };
  });
  allWords.set(index, new Set(index.flatMap((e) => [...e.titleWords, ...e.otherWords])));
  return index;
}

/** Every word in an index, worked out once (audit, performance). */
const allWords = new WeakMap<readonly Indexed[], ReadonlySet<string>>();

function wordsOf(index: readonly Indexed[]): ReadonlySet<string> {
  return allWords.get(index) ?? new Set(index.flatMap((e) => [...e.titleWords, ...e.otherWords]));
}

/** A word some recipe has as typed (or starts with): typo help is then off for it, so "pasta" doesn't find curry paste. */
function spelledRightIn(words: ReadonlySet<string>, q: string): boolean {
  if (words.has(q)) return true;
  if (q.length < 2) return false;
  for (const w of words) if (w.startsWith(q)) return true;
  return false;
}

/**
 * Every query word must match somewhere. Title matches outrank ingredient
 * and cuisine matches; exact beats prefix beats typo. Ties keep catalogue order.
 * Typos are only forgiven for a word nothing matches as typed: otherwise
 * "pasta" would also find every recipe with curry paste.
 */
export function searchRecipes(index: readonly Indexed[], query: string): Recipe[] {
  const words = normaliseWords(query).map(spellings);
  if (words.length === 0) return index.map((i) => i.recipe);
  const weight = { exact: 3, prefix: 2, fuzzy: 0 } as const;
  const vocabulary = wordsOf(index);
  // Each query word is matched against every distinct word once, not once per recipe (audit, performance).
  const scoreOf = words.map((alternatives) => {
    const best = new Map<string, number>();
    for (const q of alternatives) {
      const fuzzy = spelledRightIn(vocabulary, q) ? 0 : 1;
      for (const w of vocabulary) {
        const m = wordMatches(q, w);
        if (m) best.set(w, Math.max(best.get(w) ?? 0, m === 'fuzzy' ? fuzzy : weight[m]));
      }
    }
    return best;
  });
  const scored: { recipe: Recipe; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    let score = 0;
    for (const matches of scoreOf) {
      let best = 0;
      for (const w of entry.titleWords) best = Math.max(best, (matches.get(w) ?? 0) * 10);
      for (const w of entry.otherWords) best = Math.max(best, matches.get(w) ?? 0);
      if (best === 0) return;
      score += best;
    }
    scored.push({ recipe: entry.recipe, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.recipe);
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
