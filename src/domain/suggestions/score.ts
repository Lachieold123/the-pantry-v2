// One score per recipe for Home, and the one true line that says why
// (docs/HOME-RANKING.md §3–4). The score is a plain sum of named parts, each
// from the weights table below, so any card's place can be explained part by
// part. The reason line is chosen from the parts that actually scored: it can
// only say something that is true of this dish for this cook today.

import type { Cookable, Tier } from '../cupboard/cookable';
import { CUISINE_LABELS, formatMinutes } from '../recipes/labels';
import { totalMinutes, type CuisineId, type Recipe, type Season } from '../recipes/types';
import { stableJitter } from './jitter';
import { mealFit, seasonFit, type DayKind, type MealWindow, type TimeBudget } from './moment';
import type { Signals } from './signals';

/** Every number the ranking uses, in points. Tuning Home means changing this table, nothing else. */
export type Weights = {
  meal: number;
  time: number;
  hardOnWeeknight: number;
  season: number;
  ready: number;
  nearly: number;
  perMissing: number;
  uses: number;
  usesCap: number;
  perishable: number;
  perishableCap: number;
  swap: number;
  likedCuisine: number;
  learnedCuisine: number;
  saved: number;
  savedUncooked: number;
  regular: number;
  rediscover: number;
  viewed: number;
  recent: number;
  recentFade: number;
  planned: number;
  vetted: number;
  reviewed: number;
  draft: number;
  noPhoto: number;
  jitter: number;
};

// The reasoning for each number is in docs/HOME-RANKING.md §5.
const EVERYTHING: Weights = {
  meal: 4,
  time: 2,
  hardOnWeeknight: 1,
  season: 1.5,
  ready: 1.5,
  nearly: 0.5,
  perMissing: 0.25,
  uses: 0,
  usesCap: 0,
  perishable: 0,
  perishableCap: 0,
  swap: 0,
  likedCuisine: 2,
  learnedCuisine: 2,
  saved: 2.5,
  savedUncooked: 0.5,
  regular: 2,
  rediscover: 1,
  viewed: 1.5,
  recent: 8,
  recentFade: 3,
  planned: 4,
  vetted: 1,
  reviewed: 0.5,
  draft: 1,
  noPhoto: 1.5,
  jitter: 1.5,
};

/** "What I have": every dish is ready, so readiness can't rank them; using more of the cupboard (fresh food most) does. */
const PANTRY: Weights = {
  ...EVERYTHING,
  ready: 0,
  nearly: 0,
  perMissing: 0,
  uses: 0.5,
  usesCap: 3,
  perishable: 0.5,
  perishableCap: 1.5,
  swap: 0.25,
};

export const WEIGHTS = { all: EVERYTHING, pantry: PANTRY } as const;

/** Cooked this recently: pushed right down (not out, so a small pool still fills). */
export const RECENT_DAYS = 10;
/** Between RECENT_DAYS and this, the push fades out. */
export const FADE_DAYS = 21;
/** Recent keeps 20; the most recent counts most. */
const VIEWED_SPAN = 20;

export type ReasonKind =
  | 'ready'
  | 'nearly'
  | 'saved-uncooked'
  | 'saved'
  | 'regular'
  | 'cooked-before'
  | 'viewed'
  | 'liked-cuisine'
  | 'cooked-cuisine'
  | 'quick'
  | 'weekend'
  | 'in-season'
  | 'meal';
export type Reason = { kind: ReasonKind; text: string };

/** When two lines carry the same points, the more personal one wins: it's the more useful thing to read. */
const PRIORITY: readonly ReasonKind[] = [
  'saved-uncooked',
  'regular',
  'saved',
  'cooked-before',
  'viewed',
  'liked-cuisine',
  'cooked-cuisine',
  'ready',
  'nearly',
  'quick',
  'in-season',
  'weekend',
  'meal',
];

export type ScoreContext = {
  window: MealWindow;
  /** True when the cook picked a Meal filter: every dish fits it, so the clock shouldn't reorder them. */
  mealChosen: boolean;
  day: DayKind;
  budget: TimeBudget;
  /** Minutes that count as "quick" in a reason line. */
  quick: number;
  season: Season;
  liked: ReadonlySet<CuisineId>;
  signals: Signals;
  cupboard: ReadonlyMap<string, { tier: Tier; result: Cookable }>;
  /** Today's date: the order holds all day and moves on tomorrow. */
  seed: string;
};

export type Scored = { score: number; parts: Readonly<Record<string, number>>; reason: Reason | undefined };

/** "Often" has to be true: at least three cooks, and at least a fifth of everything they've cooked. */
export function cooksOften(signals: Pick<Signals, 'cuisineCooks' | 'totalCooks'>, cuisine: CuisineId): boolean {
  const n = signals.cuisineCooks.get(cuisine) ?? 0;
  return n >= 3 && n >= signals.totalCooks / 5;
}

/** "3 weeks ago", "2 months ago", "over a year ago". */
export function agoText(days: number): string {
  if (days < 14) return days <= 1 ? 'yesterday' : `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? 'a month ago' : `${months} months ago`;
  }
  return 'over a year ago';
}

export function scoreRecipe(recipe: Recipe, ctx: ScoreContext, w: Weights): Scored {
  const parts: Record<string, number> = {};
  // Each candidate line carries the points behind it; the strongest true one wins.
  const reasons: { reason: Reason; points: number }[] = [];
  const add = (part: string, points: number) => {
    if (points !== 0) parts[part] = (parts[part] ?? 0) + points;
  };
  const say = (kind: ReasonKind, text: string, points: number) => reasons.push({ reason: { kind, text }, points });
  const h = ctx.signals.of(recipe.id);
  const cuisine = CUISINE_LABELS[recipe.cuisine];

  // Fit to now: the meal the clock points at, the time tonight allows, the season.
  if (!ctx.mealChosen) {
    add('meal', w.meal * mealFit(recipe, ctx.window));
    if (ctx.window === 'morning' && recipe.mealTypes.includes('breakfast')) say('meal', 'For breakfast', 0.1);
    if (ctx.window === 'midday' && recipe.mealTypes.includes('lunch')) say('meal', 'For lunch', 0.1);
  }
  const minutes = totalMinutes(recipe);
  // 0 minutes means the time wasn't given (some of your own recipes): no score, no claim.
  if (minutes > 0) {
    const k = ctx.budget.told ? 1 : 0.5;
    const over = (minutes - ctx.budget.minutes) / ctx.budget.minutes;
    add('time', over <= 0 ? w.time * k : -w.time * k * Math.min(1, over));
    // "Weeknight" only means something at dinner time; earlier in the day, quick is just quick.
    const dinnerTime = ctx.window === 'afternoon' || ctx.window === 'evening' || ctx.window === 'late';
    if (minutes <= ctx.quick && !dinnerTime) say('quick', `Quick · ${formatMinutes(minutes)}`, w.time * k);
    if (minutes <= ctx.quick && dinnerTime && ctx.day === 'weeknight')
      say('quick', `Quick for a weeknight · ${formatMinutes(minutes)}`, w.time * k);
    if (ctx.day === 'weekend' && minutes > 60) say('weekend', `Weekend cooking · ${formatMinutes(minutes)}`, 0.3);
  }
  if (ctx.day === 'weeknight' && recipe.difficulty === 'hard') add('time', -w.hardOnWeeknight);
  const fit = seasonFit(recipe, ctx.season);
  add('season', fit * w.season);
  if (fit === 1) say('in-season', `In season for ${ctx.season}`, w.season);

  // What you have.
  const c = ctx.cupboard.get(recipe.id);
  if (c) {
    const missing = c.result.missing.length;
    if (c.tier === 'ready') {
      add('cupboard', w.ready);
      say('ready', 'Ready with what you have', w.ready);
    } else {
      const points = w.nearly - w.perMissing * (missing - 1);
      add('cupboard', points);
      say('nearly', missing === 1 ? 'One thing to buy' : `${missing} things to buy`, points);
    }
    add('cupboard', Math.min(w.usesCap, w.uses * (c.result.have.length + c.result.swaps.length)));
    add('cupboard', Math.min(w.perishableCap, w.perishable * c.result.perishablesUsed));
    add('cupboard', -w.swap * c.result.swaps.length);
  }

  // Taste: what they told us, then what they've done.
  if (ctx.liked.has(recipe.cuisine)) {
    add('taste', w.likedCuisine);
    say('liked-cuisine', `Because you like ${cuisine}`, w.likedCuisine);
  }
  const lean = ctx.signals.cuisineAffinity.get(recipe.cuisine) ?? 0;
  if (lean > 0) {
    add('taste', w.learnedCuisine * lean);
    if (cooksOften(ctx.signals, recipe.cuisine)) say('cooked-cuisine', `You often cook ${cuisine}`, w.learnedCuisine * lean);
  }
  if (h.saved) {
    add('taste', w.saved);
    if (h.cooks === 0) {
      add('taste', w.savedUncooked);
      say('saved-uncooked', 'Saved, not cooked yet', w.saved + w.savedUncooked);
    } else say('saved', 'In your Cookmarks', w.saved);
  }
  const days = h.daysSinceCooked;
  if (days !== undefined && days > RECENT_DAYS) {
    if (h.cooks >= 2) {
      add('taste', w.regular);
      say('regular', `A regular · cooked ${h.cooks} times`, w.regular);
    } else if (days >= FADE_DAYS) {
      add('taste', w.rediscover);
      say('cooked-before', `You cooked this ${agoText(days)}`, w.rediscover);
    }
  }
  if (h.viewedRank !== undefined && !h.saved && h.cooks === 0) {
    const points = w.viewed * (1 - h.viewedRank / VIEWED_SPAN);
    add('taste', points);
    say('viewed', 'You looked at this lately', points);
  }

  // Freshness: not what you just ate, not what's already coming this week.
  if (days !== undefined && days <= RECENT_DAYS) add('fresh', -w.recent);
  else if (days !== undefined && days < FADE_DAYS) add('fresh', (-w.recentFade * (FADE_DAYS - days)) / (FADE_DAYS - RECENT_DAYS));
  if (h.planned) add('fresh', -w.planned);

  // Quality: checked recipes and a photo for the card.
  if (recipe.provenance === 'vetted') add('quality', w.vetted);
  if (recipe.provenance === 'reviewed') add('quality', w.reviewed);
  if (recipe.provenance === 'ai-draft') add('quality', -w.draft);
  if (!recipe.image) add('quality', -w.noPhoto);

  // Stability: a small, fixed nudge per dish per day, so near-ties settle differently each day but never within one.
  add('jitter', w.jitter * stableJitter(ctx.seed, recipe.id));

  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  const best = reasons
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points || PRIORITY.indexOf(a.reason.kind) - PRIORITY.indexOf(b.reason.kind))[0];
  return { score, parts, reason: best?.reason };
}
