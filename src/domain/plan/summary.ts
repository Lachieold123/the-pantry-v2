// The week at a glance: how full it is ("2 of 21 meals") and the plan as text
// to send someone ("Mon: Dal. Tue: Tacos…"), v1's share button (M19).

import { entriesFor, mealCount, SLOTS, weekDays, type ISODate, type PlanEntry, type Slot } from './week';

export const MEALS_PER_WEEK = SLOTS.length * 7;

export function weekProgress(entries: readonly PlanEntry[], start: ISODate): { planned: number; total: number } {
  const days = new Set(weekDays(start));
  return { planned: mealCount(entries.filter((e) => days.has(e.day))), total: MEALS_PER_WEEK };
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
