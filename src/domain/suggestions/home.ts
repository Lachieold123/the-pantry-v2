// The home page (v1's feed, spec §7 Feed): five big cards to swipe through,
// then a two-column grid, both narrowed by the filter chips above them.
//
// v1 filled this with other people's posts and called the top five "Editor's
// pick". Until posts arrive (P9), the cards are recipes, and the label says
// why each one is there: tonight's planned dinner first, then something the
// cupboard can make now, then picks for this cook. Nothing claims to be
// trending or chosen by an editor, because nothing is.

import { matchesFilters, NO_FILTERS, type RecipeFilters, type TimeFilter } from '../recipes/search';
import type { CuisineId, Difficulty, MealType, Recipe } from '../recipes/types';

export type HomeFilters = {
  meal?: MealType | undefined;
  time?: TimeFilter | undefined;
  cuisine?: CuisineId | undefined;
  difficulty?: Difficulty | undefined;
};

export const NO_HOME_FILTERS: HomeFilters = {};

/** Why a card is at the top: it decides the card's label. */
export type HeroReason = 'planned' | 'cupboard' | 'pick';
export type Hero = { recipe: Recipe; reason: HeroReason };

export const HERO_COUNT = 5;

type Input = {
  /** Tonight's planned dinner, if there is one. */
  tonight: Recipe | undefined;
  /** Dishes the cupboard can make now, best first. */
  cookableNow: readonly Recipe[];
  /** The ranked picks for this cook (diet and avoid list already applied). */
  forYou: readonly Recipe[];
  filters: HomeFilters;
  gridCount: number;
};

export function hasHomeFilters(f: HomeFilters): boolean {
  return Boolean(f.meal || f.time || f.cuisine || f.difficulty);
}

function asRecipeFilters(f: HomeFilters): RecipeFilters {
  return {
    ...NO_FILTERS,
    mealTypes: f.meal ? [f.meal] : [],
    time: f.time,
    cuisines: f.cuisine ? [f.cuisine] : [],
    difficulties: f.difficulty ? [f.difficulty] : [],
  };
}

/** The cards and the grid, with no recipe twice. Filters apply to both, the planned dinner included. */
export function homeFeed({ tonight, cookableNow, forYou, filters, gridCount }: Input): { heroes: Hero[]; grid: Recipe[] } {
  const rf = asRecipeFilters(filters);
  const fits = (r: Recipe) => matchesFilters(r, rf);
  const seen = new Set<string>();
  const heroes: Hero[] = [];
  const add = (recipe: Recipe | undefined, reason: HeroReason) => {
    if (!recipe || seen.has(recipe.id) || !fits(recipe) || heroes.length >= HERO_COUNT) return;
    seen.add(recipe.id);
    heroes.push({ recipe, reason });
  };
  add(tonight, 'planned');
  // One cupboard card is enough up top; the Cupboard tab has the full list.
  add(
    cookableNow.find((r) => fits(r) && !seen.has(r.id)),
    'cupboard',
  );
  for (const r of forYou) add(r, 'pick');
  const grid = forYou.filter((r) => !seen.has(r.id) && fits(r)).slice(0, gridCount);
  return { heroes, grid };
}

/** The small amber line on a card: "Tonight · On the plan", "Picked for you · Easy". */
export function heroKicker(hero: Hero, difficultyLabel: string): string {
  if (hero.reason === 'planned') return 'Tonight · On the plan';
  if (hero.reason === 'cupboard') return 'From your cupboard · Ready now';
  return `Picked for you · ${difficultyLabel}`;
}
