// The home page (v1's feed, spec §7 Feed): five big cards to swipe through,
// then a two-column grid, all narrowed by the controls above them.
//
// The first control is the app's reason for being (D-034): "What I have".
// In that mode Home shows only dishes the cupboard can make now, then a
// "Nearly there" shelf of dishes one or two things short (SuperCook's tiers,
// from the same engine as the Cupboard tab). "Everything" is the wider feed:
// tonight's planned dinner, one cupboard dish, then picks for this cook.
// Meal, time, cuisine and difficulty narrow either mode.
//
// v1 called its top cards "Editor's pick". Here every label says why the card
// is there, and nothing claims to be trending or chosen by an editor.
//
// The order of every list comes from the ranking (rank.ts, docs/HOME-RANKING.md);
// this file only lays the ranked lists out.

import { matchesFilters, NO_FILTERS, type RecipeFilters, type TimeFilter } from '../recipes/search';
import type { CuisineId, Difficulty, MealType, Recipe } from '../recipes/types';

export type HomeMode = 'pantry' | 'all';

export type HomeFilters = {
  meal?: MealType | undefined;
  time?: TimeFilter | undefined;
  cuisine?: CuisineId | undefined;
  difficulty?: Difficulty | undefined;
};

export const NO_HOME_FILTERS: HomeFilters = {};

/** Why a card is at the top: it decides the card's label. */
export type HeroReason = 'planned' | 'ready' | 'nearly' | 'pick';
export type Hero = {
  recipe: Recipe;
  reason: HeroReason;
  /** For a pick: the ranking's one true line about it ("In your Cookmarks"). */
  why?: string | undefined;
};

export const HERO_COUNT = 5;

type Input = {
  mode: HomeMode;
  /** Tonight's planned dinner, if there is one. */
  tonight: Recipe | undefined;
  /** Dishes the cupboard can make now, best first. */
  ready: readonly Recipe[];
  /** Dishes one or two things short, best first. */
  nearly: readonly Recipe[];
  /** The ranked picks for this cook (diet and avoid list already applied). */
  forYou: readonly Recipe[];
  filters: HomeFilters;
  gridCount: number;
  /** The ranking's reason line per recipe id, for the picks' labels. */
  why?: ReadonlyMap<string, { text: string }> | undefined;
};

export type HomeFeed = {
  heroes: Hero[];
  grid: Recipe[];
  /** Pantry mode only: the "Nearly there" shelf. */
  nearly: Recipe[];
  /** Ready dishes that pass the filters, for the count on the switch. */
  readyCount: number;
};

/** Pantry mode is the default whenever the cupboard can make something (D-034). */
export function defaultHomeMode(readyCount: number): HomeMode {
  return readyCount > 0 ? 'pantry' : 'all';
}

export function hasHomeFilters(f: HomeFilters): boolean {
  return Boolean(f.meal || f.time || f.cuisine || f.difficulty);
}

export function asRecipeFilters(f: HomeFilters): RecipeFilters {
  return {
    ...NO_FILTERS,
    mealTypes: f.meal ? [f.meal] : [],
    time: f.time,
    cuisines: f.cuisine ? [f.cuisine] : [],
    difficulties: f.difficulty ? [f.difficulty] : [],
  };
}

/** The cards, the grid and the nearly shelf, with no recipe twice. Filters apply everywhere, the planned dinner included. */
export function homeFeed({ mode, tonight, ready, nearly, forYou, filters, gridCount, why }: Input): HomeFeed {
  const rf = asRecipeFilters(filters);
  const fits = (r: Recipe) => matchesFilters(r, rf);
  const readyFit = ready.filter(fits);
  const nearlyFit = nearly.filter(fits);
  const seen = new Set<string>();
  const heroes: Hero[] = [];
  const add = (recipe: Recipe | undefined, reason: HeroReason) => {
    if (!recipe || seen.has(recipe.id) || !fits(recipe) || heroes.length >= HERO_COUNT) return;
    seen.add(recipe.id);
    heroes.push(reason === 'pick' ? { recipe, reason, why: why?.get(recipe.id)?.text } : { recipe, reason });
  };
  const unseen = (list: readonly Recipe[]) => list.filter((r) => !seen.has(r.id));

  if (mode === 'pantry') {
    // Tonight's dinner leads only when the cupboard can make it: this mode never shows a dish you'd have to shop for as ready.
    if (tonight && readyFit.some((r) => r.id === tonight.id)) add(tonight, 'planned');
    for (const r of readyFit) add(r, 'ready');
    // Nothing ready that fits: the closest dishes take the cards, clearly labelled with what they need.
    if (heroes.length === 0) for (const r of nearlyFit) add(r, 'nearly');
    return {
      heroes,
      grid: unseen(readyFit).slice(0, gridCount),
      nearly: unseen(nearlyFit).slice(0, gridCount),
      readyCount: readyFit.length,
    };
  }

  add(tonight, 'planned');
  // One cupboard card is promised in this mode; more only if the ranking puts them there. "What I have" has the full set.
  add(
    readyFit.find((r) => !seen.has(r.id)),
    'ready',
  );
  // A pick the cupboard can make (or nearly) says so, with the same label as in "What I have".
  const readyIds = new Set(ready.map((r) => r.id));
  const nearlyIds = new Set(nearly.map((r) => r.id));
  for (const r of forYou) add(r, readyIds.has(r.id) ? 'ready' : nearlyIds.has(r.id) ? 'nearly' : 'pick');
  return { heroes, grid: unseen(forYou.filter(fits)).slice(0, gridCount), nearly: [], readyCount: readyFit.length };
}

/**
 * The small amber line on a card: "Tonight · On the plan", "Ready now · Nothing to buy", "Need 1: feta",
 * or for a pick the ranking's reason ("Saved, not cooked yet"). A pick with no particular reason says so plainly.
 */
export function heroKicker(hero: Hero, difficultyLabel: string, need?: string | undefined): string {
  if (hero.reason === 'planned') return 'Tonight · On the plan';
  if (hero.reason === 'ready') return 'Ready now · Nothing to buy';
  if (hero.reason === 'nearly') return need ?? 'Nearly there';
  return hero.why ?? `Picked for you · ${difficultyLabel}`;
}
