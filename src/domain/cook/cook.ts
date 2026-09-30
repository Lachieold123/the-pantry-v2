// Cook Mode helpers: finding timers in step text, oven temperatures in the
// cook's units, and the cooked log.

import type { UnitSystem } from '../ingredients/format';
import { NUMBER_PATTERN, parseNumber } from '../ingredients/quantity';
import { toISODate, type ISODate } from '../plan/week';

export type StepSegment = { type: 'text'; text: string } | { type: 'timer'; label: string; seconds: number };

const N = NUMBER_PATTERN;
const TIME_UNIT = String.raw`(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b`;
/**
 * "10 minutes", "8–10 mins", "1 1/2 hours", "1½ hours", and a compound
 * "1 hour 15 minutes" or "1 hour and 15 minutes", which is one timer, not two.
 */
const DURATION = new RegExp(
  String.raw`(${N})(?:\s*(?:-|–|to)\s*(${N}))?\s*${TIME_UNIT}(?:,?\s+(?:and\s+)?(${N})\s*(minutes?|mins?|seconds?|secs?)\b)?`,
  'gi',
);

/** Phrases where a duration is advice, not something to time: "keeps for 3 days", "up to 2 hours ahead". */
const NOT_A_TIMER_BEFORE = /\b(keeps?|lasts?|store[sd]?|up to|ahead|in advance|within|every|marinate[sd]? (?:for )?(?:at least )?)\s*$/i;
// "Rest 10 minutes before serving" is a real wait at the stove, so it keeps its timer.
const NOT_A_TIMER_AFTER = /^\s*(ahead|in advance|or overnight)/i;

function toSeconds(n: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return Math.round(n * 3600);
  if (u.startsWith('s')) return Math.round(n);
  return Math.round(n * 60);
}

/**
 * Split a step into text and tap-to-start timers. A range ("8–10 minutes")
 * uses the upper bound so the timer never goes off before the food is done.
 * Durations over 4 hours are left as text: that's planning, not a timer.
 */
export function splitStepTimers(text: string): StepSegment[] {
  const out: StepSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(DURATION)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 30), start);
    const after = text.slice(end, end + 25);
    const a = parseNumber(m[1] ?? '') ?? 0;
    const upperBound = Math.max(a, parseNumber(m[2] ?? '') ?? a);
    const extra = m[4] ? toSeconds(parseNumber(m[4]) ?? 0, m[5] ?? 'min') : 0;
    const seconds = toSeconds(upperBound, m[3] ?? 'min') + extra;
    if (NOT_A_TIMER_BEFORE.test(before) || NOT_A_TIMER_AFTER.test(after) || seconds <= 0 || seconds > 4 * 3600) continue;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push({ type: 'timer', label: m[0], seconds });
    last = end;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out.length ? out : [{ type: 'text', text }];
}

/** "200°C", "180–200 °C", "200 degrees C", "200 degrees Celsius", with any "(fan)" and any Fahrenheit already given. */
const CELSIUS =
  /(\d{2,3})(?:\s*(?:-|–|to)\s*(\d{2,3}))?\s*(?:°\s*C|degrees?\s*(?:C\b|Celsius))(?:\s*\(fan(?:-forced)?\))?(?:\s*\/\s*(\d{2,3}\s*°\s*F)|\s*\(\s*(\d{2,3}\s*°\s*F)\s*\))?/gi;

/** Oven dials go in fives: 200°C is 390°F on the page, not 392°F. */
const toFahrenheit = (c: number) => Math.round((c * 9) / 5 / 5 + 32 / 5) * 5;

/**
 * A step's text in the cook's units. Imperial cooks get oven temperatures in
 * °F, so "Heat the oven to 200°C" doesn't get set to 200 on a Fahrenheit dial.
 * Ingredient amounts inside steps are left as written: they read as the
 * recipe's own words, and the ingredient list above carries the converted ones.
 */
export function localiseStepText(text: string, system: UnitSystem): string {
  if (system === 'metric') return text;
  return text.replace(CELSIUS, (whole: string, lo: string, hi: string | undefined, slashF?: string, bracketF?: string) => {
    // "250°C / 480°F" already gives both: keep the writer's Fahrenheit rather than print it twice.
    const given = slashF ?? bracketF;
    if (given) return given.replace(/\s+/g, '');
    const fan = /\(fan/i.test(whole) ? ' (fan)' : '';
    return hi ? `${toFahrenheit(Number(lo))}–${toFahrenheit(Number(hi))}°F${fan}` : `${toFahrenheit(Number(lo))}°F${fan}`;
  });
}

export type CookEvent = {
  id: string;
  recipeId: string;
  cookedAt: number;
  /**
   * The old app only remembered *that* a dish was cooked, not when, so its
   * history arrives dated at import time. Flagged so nothing reads that date as
   * a real one: no fake streak, and it sorts behind every real cook.
   */
  dateUnknown?: true;
};

export function hasCooked(log: readonly CookEvent[], recipeId: string): boolean {
  return log.some((e) => e.recipeId === recipeId);
}

/** Recipes cooked on a local day. Cooks with no real date never count as today's. */
export function cookedOn(log: readonly CookEvent[], day: ISODate): Set<string> {
  return new Set(log.filter((e) => !e.dateUnknown && toISODate(new Date(e.cookedAt)) === day).map((e) => e.recipeId));
}

/** Most recent first, each recipe once. Cooks with no real date come after every dated one. */
export function recentlyCooked(log: readonly CookEvent[]): string[] {
  const seen = new Set<string>();
  return [...log]
    .sort((a, b) => Number(!!a.dateUnknown) - Number(!!b.dateUnknown) || b.cookedAt - a.cookedAt)
    .map((e) => e.recipeId)
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

/**
 * Weeks in a row (Monday-start, local time) with at least one cook, counting
 * back from this week. This week not having a cook yet doesn't break the
 * streak until the week is over: a quiet streak shouldn't nag on Monday.
 * Cooks with no real date are left out: they'd all land in the import week.
 */
export function weeklyStreak(log: readonly CookEvent[], now: Date): number {
  const weekKey = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  };
  const weeks = new Set(log.filter((e) => !e.dateUnknown).map((e) => weekKey(e.cookedAt)));
  const cursor = new Date(weekKey(now.getTime()));
  let streak = 0;
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
