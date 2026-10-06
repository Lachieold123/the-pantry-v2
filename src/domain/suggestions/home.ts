// The home page (v1's feed, spec §7 Feed): five big cards to swipe through,
// then a two-column grid, all narrowed by the controls above them.
//
// The first control is the app's reason for being (D-034): "What I have".
// In that mode Home shows only dishes the cupboard can make now, then a
// "Nearly there" shelf of dishes one or two things short (SuperCook's tiers,
// from the same engine as the Cupboard tab). "Everything" is the wider feed:
// tonight's planned dinner, one cupboard dish, then picks for this cook.
// Time and cuisine narrow either mode. Home keeps only those two (Lachlan,
// 6 October): meal and difficulty live in Browse's fuller filters.
//
// v1 called its top cards "Editor's pick". Here every label says why the card
// is there, and nothing claims to be trending or chosen by an editor.

import { matchesFilters, NO_FILTERS, type RecipeFilters, type TimeFilter } from '../recipes/search';
import type { CuisineId, Recipe } from '../recipes/types';

export type HomeMode = 'pantry' | 'all';

export type HomeFilters = {
  time?: TimeFilter | undefined;
  cuisine?: CuisineId | undefined;
};

export const NO_HOME_FILTERS: HomeFilters = {};

/** Why a card is at the top: it decides the card's label. */
export type HeroReason = 'planned' | 'ready' | 'nearly' | 'pick';
export type Hero = { recipe: Recipe; reason: HeroReason };

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
  return Boolean(f.time || f.cuisine);
}

// Reads only the two fields Home has, so a meal or difficulty left over from
// before (Home had four filters until October) can never narrow the feed unseen.
function asRecipeFilters(f: HomeFilters): RecipeFilters {
  return { ...NO_FILTERS, time: f.time, cuisines: f.cuisine ? [f.cuisine] : [] };
}

/** The cards, the grid and the nearly shelf, with no recipe twice. Filters apply everywhere, the planned dinner included. */
export function homeFeed({ mode, tonight, ready, nearly, forYou, filters, gridCount }: Input): HomeFeed {
  const rf = asRecipeFilters(filters);
  const fits = (r: Recipe) => matchesFilters(r, rf);
  const readyFit = ready.filter(fits);
  const nearlyFit = nearly.filter(fits);
  const seen = new Set<string>();
  const heroes: Hero[] = [];
  const add = (recipe: Recipe | undefined, reason: HeroReason) => {
    if (!recipe || seen.has(recipe.id) || !fits(recipe) || heroes.length >= HERO_COUNT) return;
    seen.add(recipe.id);
    heroes.push({ recipe, reason });
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
  // One cupboard card is enough in this mode; "What I have" has the full set.
  add(
    readyFit.find((r) => !seen.has(r.id)),
    'ready',
  );
  for (const r of forYou) add(r, 'pick');
  return { heroes, grid: unseen(forYou.filter(fits)).slice(0, gridCount), nearly: [], readyCount: readyFit.length };
}

/** The small amber line on a card: "Tonight · On the plan", "Ready now · Nothing to buy", "Need 1 · Feta". */
export function heroKicker(hero: Hero, difficultyLabel: string, need?: string | undefined): string {
  if (hero.reason === 'planned') return 'Tonight · On the plan';
  if (hero.reason === 'ready') return 'Ready now · Nothing to buy';
  if (hero.reason === 'nearly') return need ?? 'Nearly there';
  return `Picked for you · ${difficultyLabel}`;
}
