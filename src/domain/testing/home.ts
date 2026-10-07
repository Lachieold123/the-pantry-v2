// Test helpers for Home's ranking: a clock you can set, a cupboard from plain
// ingredient ids, a default input, and an independent check that a reason
// line is true. The check re-derives each claim from the raw inputs, never
// from the ranking's own signals, so a bug in the ranking can't vouch for itself.

import { DEFAULT_SHELF, whatCanICook, type CookableMatch } from '../cupboard/cookable';
import { CUISINE_LABELS, formatMinutes } from '../recipes/labels';
import { TIME_LIMIT_MINUTES } from '../recipes/search';
import { totalMinutes, type Recipe } from '../recipes/types';
import { NO_HOME_FILTERS } from '../suggestions/home';
import { dayKind, momentOf, seasonFor, type Moment } from '../suggestions/moment';
import type { RankInput, Taste } from '../suggestions/rank';
import type { Reason } from '../suggestions/score';
import { NO_HISTORY } from '../suggestions/signals';
import { catalogue, index, kitchen } from './fixtures';

export const DAY = 24 * 60 * 60 * 1000;

/** A local date and time. */
export function at(date: string, hour: number, minute = 0): Moment {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return momentOf(new Date(y, m - 1, d, hour, minute));
}

/** Tuesday 6 October 2026, 6pm: the North Star moment. */
export const TUESDAY_6PM = at('2026-10-06', 18);

export const NO_TASTE: Taste = { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined };

export function cupboardOf(have: readonly string[], recipes: readonly Recipe[] = catalogue): CookableMatch[] {
  const { ready, nearly } = whatCanICook({
    recipes,
    have: new Set(have),
    shelf: DEFAULT_SHELF,
    index,
    kitchen,
    saved: new Set(),
    seed: 'test',
  });
  return [...ready, ...nearly];
}

export function rankInput(over: Partial<RankInput> = {}): RankInput {
  return {
    recipes: catalogue,
    taste: NO_TASTE,
    hidden: new Set(),
    filters: NO_HOME_FILTERS,
    history: NO_HISTORY,
    cupboard: [],
    index,
    moment: TUESDAY_6PM,
    depth: 29,
    ...over,
  };
}

/** Undefined if the line is true of this recipe for this input; otherwise what's wrong with it. */
export function falseReason(recipe: Recipe, reason: Reason, input: RankInput): string | undefined {
  const { history, moment, taste } = input;
  const cooks = history.cookLog.filter((e) => e.recipeId === recipe.id);
  const lastDays = cooks.length ? Math.floor((moment.nowMs - Math.max(...cooks.map((e) => e.cookedAt))) / DAY) : undefined;
  const saved = history.bookmarks.some((b) => b.recipeId === recipe.id);
  const match = input.cupboard.find((m) => m.recipe.id === recipe.id);
  const minutes = totalMinutes(recipe);
  const cuisine = CUISINE_LABELS[recipe.cuisine];
  const fail = (why: string) => `${recipe.id}: "${reason.text}" ${why}`;
  switch (reason.kind) {
    case 'ready':
      return match?.tier === 'ready' ? undefined : fail('but the cupboard can’t make it');
    case 'nearly':
      return match?.tier === 'nearly' &&
        reason.text.startsWith(match.result.missing.length === 1 ? 'One' : `${match.result.missing.length}`)
        ? undefined
        : fail('but that isn’t what it needs');
    case 'saved-uncooked':
      return saved && cooks.length === 0 ? undefined : fail('but it isn’t saved-and-uncooked');
    case 'saved':
      return saved ? undefined : fail('but it isn’t saved');
    case 'regular':
      return cooks.length >= 2 && reason.text.includes(`${cooks.length} times`)
        ? undefined
        : fail(`but it was cooked ${cooks.length} times`);
    case 'cooked-before':
      return cooks.length >= 1 && lastDays !== undefined && lastDays >= 21 ? undefined : fail('but it wasn’t cooked that long ago');
    case 'viewed':
      return history.recentlyViewed.includes(recipe.id) ? undefined : fail('but it isn’t in Recent');
    case 'liked-cuisine':
      return taste.cuisines.includes(recipe.cuisine) && reason.text.includes(cuisine) ? undefined : fail('but that’s not a chosen cuisine');
    case 'cooked-cuisine': {
      const ids = new Set(input.recipes.filter((r) => r.cuisine === recipe.cuisine).map((r) => r.id));
      const known = new Set(input.recipes.map((r) => r.id));
      const n = history.cookLog.filter((e) => ids.has(e.recipeId)).length;
      const total = history.cookLog.filter((e) => known.has(e.recipeId)).length;
      return n >= 3 && n >= total / 5 && reason.text.includes(cuisine) ? undefined : fail(`but only ${n} of ${total} cooks are ${cuisine}`);
    }
    case 'quick': {
      const limit = Math.min(taste.weeknight ? TIME_LIMIT_MINUTES[taste.weeknight] : 45, 30);
      const quick = minutes > 0 && minutes <= limit && reason.text.endsWith(formatMinutes(minutes));
      const dinnerTime = moment.hour >= 21 || moment.hour < 5 || moment.hour * 60 + moment.minute >= 14 * 60 + 30;
      const weeknightClaim = reason.text.includes('weeknight');
      const claimHolds = weeknightClaim ? dinnerTime && dayKind(moment.today) === 'weeknight' : !dinnerTime;
      return quick && claimHolds ? undefined : fail(`but it takes ${minutes} minutes, ${moment.hour}:00 on a ${dayKind(moment.today)}`);
    }
    case 'weekend':
      return dayKind(moment.today) === 'weekend' && minutes > 60 ? undefined : fail('but it isn’t a long weekend cook');
    case 'in-season':
      return recipe.seasons?.includes(seasonFor(moment.today)) ? undefined : fail('but it isn’t tagged for this season');
    case 'meal': {
      const meal = reason.text === 'For breakfast' ? 'breakfast' : 'lunch';
      const hour = moment.hour + moment.minute / 60;
      const inWindow = meal === 'breakfast' ? hour >= 5 && hour < 10.5 : hour >= 10.5 && hour < 14.5;
      return recipe.mealTypes.includes(meal) && inWindow ? undefined : fail('but it isn’t that meal, or it isn’t that time');
    }
  }
}
