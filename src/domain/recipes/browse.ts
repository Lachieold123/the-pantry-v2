// What Browse shows before you search (spec §7 Browse): a recipe of the day,
// quick chips and "cook by mood" shelves. v1's chips and moods were mostly
// labels with no data behind them ("Comfort", "Spicy"); here every one is a
// real filter or search, so tapping it always means something.

import { stableJitter } from '../suggestions/forYou';
import { matchesFilters, NO_FILTERS, type RecipeFilters } from './search';
import type { Recipe, Season } from './types';

export type Preset = { id: string; label: string; filters?: Partial<RecipeFilters>; query?: string };

/** The row of chips under the recipe of the day. Word chips search; the rest filter. */
export function quickChips(season: Season): Preset[] {
  return [
    { id: 'pasta', label: 'Pasta', query: 'pasta' },
    { id: 'curry', label: 'Curry', query: 'curry' },
    { id: 'quick', label: '30 min', filters: { time: 'under-30' } },
    { id: 'vegetarian', label: 'Vegetarian', filters: { diet: 'vegetarian' } },
    { id: 'vegan', label: 'Vegan', filters: { diet: 'vegan' } },
    { id: 'one-pot', label: 'One-pot', filters: { onePot: true } },
    { id: 'season', label: 'In season', filters: { inSeason: season } },
    { id: 'soup', label: 'Soup', query: 'soup' },
    { id: 'easy', label: 'Easy', filters: { difficulties: ['easy'] } },
    { id: 'breakfast', label: 'Breakfast', filters: { mealTypes: ['breakfast'] } },
  ];
}

/** "Cook by mood" shelves: each a named set of filters. */
export function moods(season: Season): Preset[] {
  return [
    { id: 'weeknight', label: 'Easy weeknights', filters: { mealTypes: ['dinner'], difficulties: ['easy'], time: 'under-45' } },
    { id: 'under-30', label: 'Under 30 minutes', filters: { time: 'under-30' } },
    { id: 'plant', label: 'Plant forward', filters: { diet: 'vegetarian' } },
    { id: 'one-pot', label: 'One pot, few dishes', filters: { onePot: true } },
    { id: 'weekend', label: 'Weekend project', filters: { time: 'over-60' } },
    { id: 'season', label: `Best this ${season}`, filters: { inSeason: season } },
  ];
}

function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/** A preset is on when everything it sets is set exactly that way (and its search, if any, is the search). */
export function presetActive(p: Preset, filters: RecipeFilters, query: string): boolean {
  if (p.query !== undefined && query.trim().toLowerCase() !== p.query) return false;
  for (const [key, value] of Object.entries(p.filters ?? {})) {
    const current = filters[key as keyof RecipeFilters];
    if (Array.isArray(value) ? !Array.isArray(current) || !sameList(value, current) : current !== value) return false;
  }
  return true;
}

/** Tapping a preset turns it on, or off again if it was on. Turning it off resets only what it set. */
export function togglePreset(p: Preset, filters: RecipeFilters, query: string): { filters: RecipeFilters; query: string } {
  if (presetActive(p, filters, query)) {
    const reset: Partial<RecipeFilters> = {};
    for (const key of Object.keys(p.filters ?? {}) as (keyof RecipeFilters)[]) Object.assign(reset, { [key]: NO_FILTERS[key] });
    return { filters: { ...filters, ...reset }, query: p.query !== undefined ? '' : query };
  }
  return { filters: { ...filters, ...p.filters }, query: p.query ?? query };
}

export function recipesFor(p: Preset, recipes: readonly Recipe[]): Recipe[] {
  const filters = { ...NO_FILTERS, ...p.filters };
  return recipes.filter((r) => matchesFilters(r, filters));
}

/** The same recipe all day, a different one tomorrow; favours dinners with a photo. */
export function recipeOfTheDay(recipes: readonly Recipe[], day: string, hasPhoto: (r: Recipe) => boolean): Recipe | undefined {
  const pool = recipes.filter((r) => r.mealTypes.includes('dinner') && hasPhoto(r));
  return dailyPicks(pool.length ? pool : recipes, day, 1)[0];
}

/** A stable daily shuffle: the same picks all day, fresh ones tomorrow. */
export function dailyPicks(recipes: readonly Recipe[], day: string, count: number): Recipe[] {
  return [...recipes].sort((a, b) => stableJitter(day, a.id) - stableJitter(day, b.id)).slice(0, count);
}
