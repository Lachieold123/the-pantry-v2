// The week at a glance: how full it is ("2 of 21 meals") and the plan as text
// to send someone ("Mon: Dal. Tue: Tacos…"), v1's share button (M19).

import { addDays, entriesFor, fromISODate, SLOTS, weekDays, weekStart, type ISODate, type PlanEntry, type Slot } from './week';

export const MEALS_PER_WEEK = SLOTS.length * 7;

export function weekProgress(entries: readonly PlanEntry[], start: ISODate): { planned: number; total: number } {
  const days = new Set(weekDays(start));
  // A slot counts once, however many dishes are in it.
  const filled = new Set(entries.filter((e) => days.has(e.day)).map((e) => `${e.day}:${e.slot}`));
  return { planned: filled.size, total: MEALS_PER_WEEK };
}

const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' } as const;

/** Plain text for a message: one line per planned day, empty days left out. */
export function weekAsText(
  entries: readonly PlanEntry[],
  start: ISODate,
  titleOf: (recipeId: string) => string | undefined,
  dayLabel: (day: ISODate) => string,
): string {
  const lines: string[] = [];
  for (const day of weekDays(start)) {
    const meals = entriesFor(entries, day)
      .map((e) => {
        const title = titleOf(e.recipeId);
        return title ? `${SLOT_LABEL[e.slot]}: ${title}` : undefined;
      })
      .filter((m): m is string => m !== undefined);
    if (meals.length) lines.push(`${dayLabel(day)}\n${meals.map((m) => `  ${m}`).join('\n')}`);
  }
  return lines.length ? `Our week\n\n${lines.join('\n\n')}` : '';
}

/** The first meal of the day with nothing planned, or undefined when the day is full. */
export function firstOpenSlot(entries: readonly PlanEntry[], day: ISODate): Slot | undefined {
  return SLOTS.find((slot) => entriesFor(entries, day, slot).length === 0);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Where a planned meal went, for "Dal planned for …" (audit F141, F172):
 * "tonight", "lunch today", "dinner tomorrow", "dinner on Thursday", and
 * "dinner on Thursday next week" so next week's toast can't be read as this week's.
 */
export function planWhere(day: ISODate, slot: Slot, today: ISODate): string {
  if (day === today) return slot === 'dinner' ? 'tonight' : `${slot} today`;
  if (day === addDays(today, 1)) return `${slot} tomorrow`;
  const date = fromISODate(day);
  const name = WEEKDAYS[date.getDay()] ?? day;
  const week = weekStart(day);
  if (week === weekStart(today)) return `${slot} on ${name}`;
  if (week === addDays(weekStart(today), 7)) return `${slot} on ${name} next week`;
  return `${slot} on ${name} ${date.getDate()} ${MONTHS[date.getMonth()] ?? ''}`.trimEnd();
}
