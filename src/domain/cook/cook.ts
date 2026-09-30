// Cook Mode helpers: finding timers in step text, and the cooked log.

export type StepSegment = { type: 'text'; text: string } | { type: 'timer'; label: string; seconds: number };

const DURATION = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;

/** Phrases where a duration is advice, not something to time: "keeps for 3 days", "up to 2 hours ahead". */
const NOT_A_TIMER_BEFORE = /\b(keeps?|lasts?|store[sd]?|up to|ahead|in advance|within|every|marinate[sd]? (?:for )?(?:at least )?)\s*$/i;
const NOT_A_TIMER_AFTER = /^\s*(ahead|in advance|before serving|or overnight)/i;

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
    const upperBound = Number(m[2] ?? m[1]);
    const seconds = toSeconds(upperBound, m[3] ?? 'min');
    if (NOT_A_TIMER_BEFORE.test(before) || NOT_A_TIMER_AFTER.test(after) || seconds <= 0 || seconds > 4 * 3600) continue;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push({ type: 'timer', label: m[0], seconds });
    last = end;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out.length ? out : [{ type: 'text', text }];
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
