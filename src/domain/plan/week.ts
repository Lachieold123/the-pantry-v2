// The week plan uses real calendar dates (D-009). Dates are stored as
// "YYYY-MM-DD" strings in the phone's local time, so "Tuesday" means the
// cook's Tuesday wherever they are, and nothing drifts across midnight UTC.

export type ISODate = string;
export const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export type Slot = (typeof SLOTS)[number];

export type PlanEntry = {
  id: string;
  recipeId: string;
  day: ISODate;
  slot: Slot;
  servings: number;
};

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: ISODate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Not a date: ${iso}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (toISODate(date) !== iso) throw new Error(`Not a real date: ${iso}`);
  return date;
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  try {
    fromISODate(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing the date. Weeks start on Monday (D-009). */
export function weekStart(iso: ISODate): ISODate {
  const d = fromISODate(iso);
  const sinceMonday = (d.getDay() + 6) % 7;
  return addDays(iso, -sinceMonday);
}

export function weekDays(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The two weeks the Plan tab shows: this week and next. */
export function visibleWeeks(today: ISODate): { thisWeek: ISODate; nextWeek: ISODate } {
  const thisWeek = weekStart(today);
  return { thisWeek, nextWeek: addDays(thisWeek, 7) };
}

export function entriesInWeek(entries: readonly PlanEntry[], start: ISODate): PlanEntry[] {
  const end = addDays(start, 7);
  return entries.filter((e) => e.day >= start && e.day < end);
}

export function entriesFor(entries: readonly PlanEntry[], day: ISODate, slot?: Slot): PlanEntry[] {
  return entries
    .filter((e) => e.day === day && (slot === undefined || e.slot === slot))
    .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}

/**
 * Tonight's dinner, if one is planned. More than one dinner is allowed: the
 * first one not yet cooked today wins, so a second dinner shows up once the
 * first is done (audit F22). When every one is cooked, the first comes back
 * and the caller shows it as cooked.
 */
export function tonightsDinner(
  entries: readonly PlanEntry[],
  today: ISODate,
  cookedToday: ReadonlySet<string> = new Set(),
): PlanEntry | undefined {
  const dinners = entriesFor(entries, today, 'dinner');
  return dinners.find((e) => !cookedToday.has(e.recipeId)) ?? dinners[0];
}

/** Entries older than 8 weeks are pruned on launch; the cook log keeps the history (D-009). */
export function pruneCutoff(today: ISODate): ISODate {
  return addDays(weekStart(today), -7 * 8);
}

export function pruneOldEntries(entries: readonly PlanEntry[], today: ISODate): PlanEntry[] {
  const cutoff = pruneCutoff(today);
  return entries.filter((e) => e.day >= cutoff);
}

/** How far pruning may move forward per launch. A clock set months ahead, even once, must not prune the whole plan (audit F08). */
export const PRUNE_STEP_DAYS = 14;

/**
 * The day to prune against, and the new high-water mark to save. `seen` is the
 * last day pruning used. A real gap (a month away) catches up over a few
 * launches; a clock jump can only ever prune two weeks more than it should.
 */
export function pruneDay(seen: ISODate | undefined, today: ISODate): { day: ISODate; seen: ISODate } {
  if (!isISODate(seen)) return { day: today, seen: today };
  const limit = addDays(seen, PRUNE_STEP_DAYS);
  const day = today < limit ? today : limit;
  return { day, seen: day > seen ? day : seen };
}

/** A saved entry good enough to show and prune. Anything else (a bad write, a bad migration) is dropped rather than crashing the Plan tab. */
export function isPlanEntry(value: unknown): value is PlanEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.recipeId === 'string' &&
    isISODate(e.day) &&
    (SLOTS as readonly unknown[]).includes(e.slot) &&
    typeof e.servings === 'number'
  );
}

/**
 * A day a meal can be added to from a link: today to the end of next week, the
 * days the Plan tab shows. A garbled or crafted link lands on the nearest one
 * rather than planning for 2099 or the past (audit F144).
 */
export function plannableDay(requested: unknown, today: ISODate): ISODate {
  if (!isISODate(requested) || requested < today) return today;
  const last = addDays(visibleWeeks(today).nextWeek, 6);
  return requested > last ? last : requested;
}

export function isPast(day: ISODate, today: ISODate): boolean {
  return day < today;
}

/** Meals still ahead, today included: the number on the Plan tab and in the drawer. */
export function upcomingCount(entries: readonly PlanEntry[], today: ISODate): number {
  return entries.filter((e) => e.day >= today).length;
}

/** The week you're shopping for: this week, except on Sunday, when it's the week ahead. */
export function shoppingWeek(today: ISODate): ISODate {
  const start = weekStart(today);
  return fromISODate(today).getDay() === 0 ? addDays(start, 7) : start;
}
