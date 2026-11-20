// Every number the Home engine uses, in one place, so tuning is a config
// change rather than a code change. The weights are hand-set and readable on
// purpose (logistic-style, docs/HOME-ENGINE.md §3): once real events exist,
// they are the starting point for fitting, not the end of it.
import type { EventType, Features, Predictions, Source } from './types';

/** One logistic head: P = sigmoid(bias + sum(weights[f] * feature f)). */
export type Head = { bias: number; weights: Partial<Record<keyof Features, number>> };

export type EngineConfig = {
  /** How many each candidate source may put forward. */
  sourceLimits: Record<Source, number>;
  /** The pantry source takes recipes with at least this share of ingredients covered... */
  cookableMinShare: number;
  /** ...or no more than this many missing. */
  cookableMaxMissing: number;
  heads: Record<keyof Predictions, Head>;
  /** Final score = sum(value * prediction) + sum(direct * feature). */
  values: Predictions;
  direct: Partial<Record<keyof Features, number>>;
  /** How much each event says about taste. Negative pushes away. */
  eventWeights: Partial<Record<EventType, number>>;
  /** Dwell counts as this many "opens" per 30 seconds, capped. */
  dwellCap: number;
  freshnessHalfLifeHours: number;
  popularityHalfLifeHours: number;
  /** "Quick" means this many minutes or fewer. */
  quickMinutes: number;
  /** Re-rank: no more than this many in a row from one cook, or one cuisine. */
  maxRunPerCook: number;
  maxRunPerCuisine: number;
  /** Re-rank: no more than this many from one cook in any page. */
  maxPerCookPerPage: number;
  pageSize: number;
  /** Re-rank: one exploration pick in every this many slots (0 turns it off). */
  exploreEvery: number;
  /** Shown this many times with no open: the item sinks. */
  seenLimit: number;
  /** Each impression past the limit multiplies the score by this. */
  seenPenalty: number;
  /** Already saved or cooked: still shown, just lower. */
  ownedPenalty: number;
};

export const DEFAULT_CONFIG: EngineConfig = {
  sourceLimits: { following: 80, cookable: 60, similar: 60, popular: 40, fresh: 30, explore: 20 },
  cookableMinShare: 0.6,
  cookableMaxMissing: 2,
  heads: {
    save: { bias: -2.6, weights: { similarity: 2.2, collab: 1.4, affinity: 1.2, follow: 0.8, pantry: 0.6, popularity: 0.8, quality: 0.6 } },
    cook: { bias: -3.2, weights: { pantry: 3.0, similarity: 1.4, quick: 0.8, affinity: 0.8, follow: 0.4, collab: 0.8 } },
    like: { bias: -2.2, weights: { follow: 1.6, affinity: 1.4, similarity: 1.2, popularity: 0.8, freshness: 0.4, quality: 0.4 } },
    dwell: { bias: -1.4, weights: { similarity: 1.6, follow: 0.8, quality: 0.8, freshness: 0.4, collab: 0.6 } },
  },
  values: { save: 1.0, cook: 1.5, like: 0.5, dwell: 0.3 },
  direct: { follow: 0.45, affinity: 0.2, pantry: 0.35, freshness: 0.15, quality: 0.1 },
  eventWeights: { open: 1, dwell: 0, like: 2, save: 3, unsave: -2, cook: 4, hide: -6, impression: 0 },
  dwellCap: 3,
  freshnessHalfLifeHours: 72,
  popularityHalfLifeHours: 96,
  quickMinutes: 30,
  maxRunPerCook: 2,
  maxRunPerCuisine: 3,
  maxPerCookPerPage: 4,
  pageSize: 20,
  exploreEvery: 8,
  seenLimit: 3,
  seenPenalty: 0.6,
  ownedPenalty: 0.5,
};

/** A config with some numbers changed, the rest default. */
export function withConfig(patch: Partial<EngineConfig>): EngineConfig {
  return { ...DEFAULT_CONFIG, ...patch };
}
