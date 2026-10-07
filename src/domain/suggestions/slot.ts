// Plan's ideas for one meal on one day ("Picked for you" on the Plan tab, and
// the ideas in Add to plan), from the same scorer as Home (rank.ts,
// docs/HOME-RANKING.md §3.9). The difference is *when*: Home scores for now;
// Plan scores for the meal being planned. Saturday's dinner is scored as a
// Saturday dinner (weekend time, that day's season) even on a Monday morning,
// and a breakfast slot only ever offers breakfasts.
//
// What the cook has done (cooked lately, saved, opened) is still measured
// from now: "you cooked this 3 weeks ago" has to be true today.

import { entriesInWeek, weekStart, type ISODate, type PlanEntry, type Slot } from '../plan/week';
import type { Moment } from './moment';
import { rankHome, type HomeRanking, type RankInput } from './rank';
import type { History } from './signals';

/**
 * The hour each meal is scored at. It decides the meal window (moment.ts), so
 * a reason line reads right for the meal: "Quick for a weeknight" for a
 * Tuesday dinner, plain "Quick" for a breakfast.
 */
const SLOT_HOUR: Readonly<Record<Slot, number>> = { breakfast: 8, lunch: 12, dinner: 18 };

/** The planned meal as a moment: that day, that meal's hour, but history measured from now. */
export function slotMoment(day: ISODate, slot: Slot, nowMs: number): Moment {
  return { today: day, hour: SLOT_HOUR[slot], minute: 0, nowMs };
}

export type SlotInput = Omit<RankInput, 'filters' | 'moment' | 'history'> & {
  day: ISODate;
  slot: Slot;
  /** The real clock, for "days since you cooked it". */
  nowMs: number;
  /** What they've done; the plan itself comes in separately so the right week can be read from it. */
  history: Omit<History, 'plannedThisWeek'>;
  /** Every plan entry. Only the target day's week counts as "already coming". */
  plan: readonly PlanEntry[];
};

/** The Home ranking's input for one planned meal. Exported so tests can check reasons against exactly what was scored. */
export function slotRankInput(input: SlotInput): RankInput {
  const { day, slot, nowMs, plan, history, ...rest } = input;
  return {
    ...rest,
    // The meal is a hard rule, like Home's Meal filter: arancini isn't a breakfast.
    filters: { meal: slot },
    history: { ...history, plannedThisWeek: new Set(entriesInWeek(plan, weekStart(day)).map((e) => e.recipeId)) },
    moment: slotMoment(day, slot, nowMs),
  };
}

/** Ideas for one slot, best first, each with its one true line. */
export function rankForSlot(input: SlotInput): HomeRanking {
  return rankHome(slotRankInput(input));
}
