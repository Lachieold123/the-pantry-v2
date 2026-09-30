// Kitchen stats (v1's StatsModal): streaks, counts and rankings, all derived
// from the cook log so there is nothing extra to store or keep in sync.
// Days and weeks are the cook's local calendar, stepped with setDate so a
// daylight-saving change never makes a day 23 or 25 hours long.
import type { CookEvent } from './cook';

function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayBefore(day: number): number {
  const d = new Date(day);
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The distinct days with at least one cook. */
function cookDays(log: readonly CookEvent[]): Set<number> {
  return new Set(log.map((e) => dayStart(e.cookedAt)));
}

/**
 * Days in a row with at least one cook, counting back from today. Today not
 * having a cook yet doesn't break the streak until the day is over, so the
 * number doesn't drop to zero every morning.
 */
export function currentStreak(log: readonly CookEvent[], now: Date): number {
  const days = cookDays(log);
  let cursor = dayStart(now.getTime());
  if (!days.has(cursor)) cursor = dayBefore(cursor);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = dayBefore(cursor);
  }
  return streak;
}

/** The longest run of consecutive cooking days ever. */
export function longestStreak(log: readonly CookEvent[]): number {
  const days = [...cookDays(log)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | undefined;
  for (const day of days) {
    run = previous !== undefined && dayBefore(day) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

/** Cooks since Monday (local time), matching the Plan's Monday-start week. */
export function cooksThisWeek(log: readonly CookEvent[], now: Date): number {
  const monday = new Date(now.getTime());
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const from = monday.getTime();
  return log.filter((e) => e.cookedAt >= from && e.cookedAt <= now.getTime()).length;
}

export type RankedCount = { key: string; count: number };

/**
 * The most frequent keys, highest first. Ties go to the one cooked most
 * recently, then alphabetically, so the order never flickers between renders.
 * Events whose key is unknown (a deleted recipe) are left out.
 */
export function topCounts(log: readonly CookEvent[], keyOf: (recipeId: string) => string | undefined, limit: number): RankedCount[] {
  const tally = new Map<string, { count: number; last: number }>();
  for (const e of log) {
    const key = keyOf(e.recipeId);
    if (key === undefined) continue;
    const t = tally.get(key) ?? { count: 0, last: 0 };
    tally.set(key, { count: t.count + 1, last: Math.max(t.last, e.cookedAt) });
  }
  return [...tally.entries()]
    .sort(([ka, a], [kb, b]) => b.count - a.count || b.last - a.last || ka.localeCompare(kb))
    .slice(0, limit)
    .map(([key, { count }]) => ({ key, count }));
}

export type KitchenStats = {
  total: number;
  streak: number;
  best: number;
  thisWeek: number;
  topCuisines: RankedCount[];
  mostCooked: RankedCount[];
};

/** Everything the stats page shows. Rankings are keyed by id; the screen turns ids into names. */
export function kitchenStats(
  log: readonly CookEvent[],
  now: Date,
  cuisineOf: (recipeId: string) => string | undefined,
  top = 3,
): KitchenStats {
  return {
    total: log.length,
    streak: currentStreak(log, now),
    best: longestStreak(log),
    thisWeek: cooksThisWeek(log, now),
    topCuisines: topCounts(log, cuisineOf, top),
    mostCooked: topCounts(log, (id) => (cuisineOf(id) === undefined ? undefined : id), top),
  };
}
