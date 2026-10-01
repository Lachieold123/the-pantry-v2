// The spinner ("Surprise me", spec §7): a deck of dishes that fit the
// meal, time and cupboard settings, a decelerating run of cards and a
// landing. Everything here is pure and the randomness is passed in, so the
// screen only animates what this decides.
//
// Two of v1's pieces are replaced, not copied: "From cupboard" was recipes
// with six ingredients or fewer (it didn't look at the cupboard), and "Why
// this" invented a "similar to dishes you liked" line. Here the cupboard
// setting uses the shared matcher, and every reason is true.

import { needLine, type Cookable } from '../cupboard/cookable';
import { formatMinutes } from '../recipes/labels';
import { matchesFilters, NO_FILTERS, type TimeFilter } from '../recipes/search';
import { totalMinutes, type MealType, type Recipe } from '../recipes/types';
import { softPick } from './surprise';

export type SpinSettings = { meal: MealType | undefined; time: TimeFilter | undefined; fromCupboard: boolean };

/** v1's starting point: tonight's dinner, 45 minutes or less. */
export const DEFAULT_SPIN: SpinSettings = { meal: 'dinner', time: 'under-45', fromCupboard: false };

/** Ticks before the landing, slowing like a wheel losing speed (v1's timings, spec §6). */
export const SPIN_DELAYS = [55, 55, 60, 70, 85, 110, 145, 195, 260] as const;

/**
 * The deck: dishes this cook may eat (already limited by diet, avoid list and
 * "not for us") that fit the settings. `cookable` is the ids the cupboard can
 * make now or nearly (the same answer the Cupboard tab gives).
 */
export function spinPool(eligible: readonly Recipe[], settings: SpinSettings, cookable: ReadonlySet<string>): Recipe[] {
  const filters = { ...NO_FILTERS, mealTypes: settings.meal ? [settings.meal] : [], time: settings.time };
  return eligible.filter((r) => matchesFilters(r, filters) && (!settings.fromCupboard || cookable.has(r.id)));
}

export type Leave = {
  /** The card showing now: a spin always lands somewhere new when it can. */
  current: string | undefined;
  planned: ReadonlySet<string>;
  recentlyCooked: readonly string[];
  shown: readonly string[];
};

/** Where a spin lands: never the card it started on, and not planned, cooked lately or seen this session while there's a choice. */
export function spinLanding(pool: readonly Recipe[], leave: Leave, random: () => number): Recipe | undefined {
  const current = new Set(leave.current ? [leave.current] : []);
  return softPick(pool, [current, leave.planned, new Set(leave.recentlyCooked.slice(0, 14)), new Set(leave.shown)], random);
}

/** The cards that flash past on the way: one per tick, never the same twice running, ending on the landing. */
export function spinReel(pool: readonly Recipe[], from: string | undefined, landing: Recipe, random: () => number): Recipe[] {
  const reel: Recipe[] = [];
  let last = from;
  for (let i = 0; i < SPIN_DELAYS.length - 1; i++) {
    const choices = pool.filter((r) => r.id !== last && r.id !== landing.id);
    const next = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] ?? landing;
    reel.push(next);
    last = next.id;
  }
  reel.push(landing);
  return reel;
}

/** Where a card sits in the deck, for the "03 / 42" counter. */
export function deckPosition(pool: readonly Recipe[], id: string | undefined): number {
  return (
    Math.max(
      0,
      pool.findIndex((r) => r.id === id),
    ) + 1
  );
}

export type Reason = { key: 'Pantry' | 'Time' | 'For you'; value: string };

type ReasonInput = {
  recipe: Recipe;
  /** How the recipe sits against the cupboard, when there's anything in it. */
  cupboard: Cookable | undefined;
  saved: boolean;
  cooked: boolean;
  nameOf: (id: string) => string;
};

/** "Why this": only things that are true of this dish for this cook. */
export function spinReasons({ recipe, cupboard, saved, cooked, nameOf }: ReasonInput): Reason[] {
  const reasons: Reason[] = [];
  if (cupboard) {
    const uses = cupboard.have.length + cupboard.swaps.length;
    const need = cupboard.missing.length;
    const list = need > 3 ? `Need ${need}: ${cupboard.missing.slice(0, 3).map(nameOf).join(', ')} and more` : needLine(cupboard, nameOf);
    reasons.push({ key: 'Pantry', value: uses ? `Uses ${uses} ${uses === 1 ? 'thing' : 'things'} you have. ${list}` : list });
  }
  const minutes = totalMinutes(recipe);
  if (minutes > 0) {
    const split =
      recipe.prepMinutes && recipe.cookMinutes
        ? ` · ${formatMinutes(recipe.prepMinutes)} prep, ${formatMinutes(recipe.cookMinutes)} cooking`
        : '';
    reasons.push({ key: 'Time', value: `${formatMinutes(minutes)}${split}` });
  }
  reasons.push({
    key: 'For you',
    value: saved ? 'In your Cookmarks' : cooked ? 'You’ve cooked this before' : 'Something you haven’t cooked yet',
  });
  return reasons;
}
