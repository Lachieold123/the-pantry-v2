// "Fit to now" for Home's ranking (docs/HOME-RANKING.md §3.1): which meal the
// clock points at, whether tonight is a weeknight, how long dinner can take,
// and the season. The time always comes in from outside (the store reads the
// phone's clock), so tests can stand at any hour of any day.

import { fromISODate, toISODate, type ISODate } from '../plan/week';
import { seasonOn, TIME_LIMIT_MINUTES, type TimeFilter } from '../recipes/search';
import type { MealType, Recipe, Season } from '../recipes/types';

/** One instant, in the phone's local time. */
export type Moment = {
  today: ISODate;
  /** 0–23, local. */
  hour: number;
  /** 0–59, local. */
  minute: number;
  /** Milliseconds since 1970, for "days since you cooked it". */
  nowMs: number;
};

/** Reads a Date in local time, so "today" is the cook's today wherever they are (D-009). */
export function momentOf(date: Date): Moment {
  return { today: toISODate(date), hour: date.getHours(), minute: date.getMinutes(), nowMs: date.getTime() };
}

export type MealWindow = 'morning' | 'midday' | 'afternoon' | 'evening' | 'late';

/**
 * Where the boundaries fall. From mid-afternoon the question is "what's for
 * dinner?" (the North Star is Tuesday 6pm), so dinner leads well before 5pm.
 */
export function mealWindow(m: Pick<Moment, 'hour' | 'minute'>): MealWindow {
  const t = m.hour * 60 + m.minute;
  if (t >= 5 * 60 && t < 10 * 60 + 30) return 'morning';
  if (t >= 10 * 60 + 30 && t < 14 * 60 + 30) return 'midday';
  if (t >= 14 * 60 + 30 && t < 17 * 60) return 'afternoon';
  if (t >= 17 * 60 && t < 21 * 60) return 'evening';
  return 'late';
}

/**
 * How well each meal suits each window, 0–1. Dinner never drops low: it's what
 * the app is for, and the catalogue has only a handful of breakfasts, so a
 * breakfast-only morning would show the same few dishes every day.
 * Late at night dinner still leads (it's tomorrow's), with snacks close behind.
 */
export const MEAL_FIT: Readonly<Record<MealWindow, Readonly<Record<MealType, number>>>> = {
  morning: { breakfast: 1, lunch: 0.4, dinner: 0.6, snack: 0.3 },
  midday: { breakfast: 0.3, lunch: 1, dinner: 0.6, snack: 0.3 },
  afternoon: { breakfast: 0, lunch: 0.3, dinner: 1, snack: 0.6 },
  evening: { breakfast: 0, lunch: 0.2, dinner: 1, snack: 0.2 },
  late: { breakfast: 0.2, lunch: 0.2, dinner: 0.8, snack: 0.6 },
};

/** The best fit among a recipe's meals. A recipe with no meal tagged fits nothing (it can still show, lower down). */
export function mealFit(recipe: Pick<Recipe, 'mealTypes'>, window: MealWindow): number {
  return recipe.mealTypes.reduce((best, meal) => Math.max(best, MEAL_FIT[window][meal]), 0);
}

export type DayKind = 'weeknight' | 'weekend';

/** Monday to Thursday are weeknights; Friday night through Sunday is the weekend. */
export function dayKind(today: ISODate): DayKind {
  const day = fromISODate(today).getDay();
  return day >= 1 && day <= 4 ? 'weeknight' : 'weekend';
}

export type TimeBudget = {
  /** Minutes a dinner can take today without counting against it. */
  minutes: number;
  /** False when the cook hasn't set a weeknight time: the budget is our guess, so it counts for less. */
  told: boolean;
};

/** Our guess when the cook hasn't said: most weeknight cooks want dinner inside 45 minutes. */
export const GUESSED_WEEKNIGHT_MINUTES = 45;

/**
 * The weeknight setting on Monday to Thursday. At the weekend there's more
 * time: half an hour more, and never less than 75 minutes.
 */
export function timeBudget(weeknight: TimeFilter | undefined, kind: DayKind): TimeBudget {
  const told = weeknight !== undefined;
  const base = weeknight ? TIME_LIMIT_MINUTES[weeknight] : GUESSED_WEEKNIGHT_MINUTES;
  return { minutes: kind === 'weeknight' ? base : Math.max(base + 30, 75), told };
}

/** "Quick" in a reason line means 30 minutes or less, or the cook's own weeknight limit if it's tighter. */
export function quickLimit(weeknight: TimeFilter | undefined): number {
  return Math.min(weeknight ? TIME_LIMIT_MINUTES[weeknight] : GUESSED_WEEKNIGHT_MINUTES, 30);
}

const OPPOSITE: Readonly<Record<Season, Season>> = { summer: 'winter', winter: 'summer', autumn: 'spring', spring: 'autumn' };

/** Australia's season (southern hemisphere). Read from the date string, so it never depends on the phone's time zone. */
export function seasonFor(today: ISODate): Season {
  return seasonOn(fromISODate(today));
}

/** +1 tagged for this season, −1 tagged only for the opposite one (a winter stew in summer), 0 otherwise. Untagged recipes are year-round. */
export function seasonFit(recipe: Pick<Recipe, 'seasons'>, season: Season): -1 | 0 | 1 {
  const tags = recipe.seasons;
  if (!tags || tags.length === 0) return 0;
  if (tags.includes(season)) return 1;
  return tags.every((t) => t === OPPOSITE[season]) ? -1 : 0;
}
