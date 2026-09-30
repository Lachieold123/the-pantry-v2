// The days a recipe can be planned on: the rest of this week, and next week.
import { addDays, toISODate, visibleWeeks, weekDays, type ISODate } from '@/domain/plan/week';

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type DayChoice = { iso: ISODate; short: string };

function describe(iso: ISODate, today: ISODate): DayChoice {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const short = iso === today ? 'Today' : iso === addDays(today, 1) ? 'Tomorrow' : `${SHORT[d.getDay()]} ${d.getDate()}`;
  return { iso, short };
}

export function planningDays(now: Date = new Date()): { thisWeek: DayChoice[]; nextWeek: DayChoice[] } {
  const today = toISODate(now);
  const { thisWeek, nextWeek } = visibleWeeks(today);
  return {
    thisWeek: weekDays(thisWeek)
      .filter((d) => d >= today)
      .map((d) => describe(d, today)),
    nextWeek: weekDays(nextWeek).map((d) => describe(d, today)),
  };
}
