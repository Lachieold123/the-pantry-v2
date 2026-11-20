// Stage 2: ranking. Each candidate gets the same nine features (0..1), four
// logistic heads predict save, cook, like and a long look (dwell), and the
// score adds their value-weighted predictions to a few direct terms (follow,
// pantry, freshness, quality). Every weight is in config.ts.
import type { Head } from './config';
import { jitter, type Context } from './context';
import { collabScore, cosine, decay, itemVector, pantryShare } from './features';
import type { EngineItem, Features, Predictions } from './types';

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function predict(head: Head, f: Features): number {
  let z = head.bias;
  for (const [k, w] of Object.entries(head.weights) as [keyof Features, number][]) z += w * f[k];
  return sigmoid(z);
}

export function featuresOf(ctx: Context, item: EngineItem): Features {
  const { config, input } = ctx;
  const cookWeight = Math.max(0, ctx.signals.cookWeight.get(item.cookId) ?? 0);
  const m = ctx.pantry.get(item.id);
  return {
    follow: ctx.follows.has(item.cookId) ? 1 : 0,
    affinity: 1 - Math.exp(-cookWeight / 6),
    pantry: m ? pantryShare(m) : 0,
    similarity: ctx.profile.size ? cosine(ctx.profile, itemVector(item)) : 0,
    collab: ctx.liked.length ? collabScore(ctx.co, ctx.liked, item.id).score : 0,
    popularity: ctx.popularity.get(item.id) ?? 0,
    freshness: decay(input.now - item.publishedAt, config.freshnessHalfLifeHours),
    quality: item.authorQuality ?? 0.5,
    quick: item.totalMinutes !== undefined && item.totalMinutes <= config.quickMinutes ? 1 : 0,
  };
}

export function predictionsOf(ctx: Context, f: Features): Predictions {
  const h = ctx.config.heads;
  return { save: predict(h.save, f), cook: predict(h.cook, f), like: predict(h.like, f), dwell: predict(h.dwell, f) };
}

/**
 * The final score. Things already seen several times with no open sink; things
 * already saved or cooked sink a little (they're in the Library already).
 */
export function scoreOf(ctx: Context, item: EngineItem, f: Features, p: Predictions): number {
  const { values, direct, seenLimit, seenPenalty, ownedPenalty } = ctx.config;
  let s = values.save * p.save + values.cook * p.cook + values.like * p.like + values.dwell * p.dwell;
  for (const [k, w] of Object.entries(direct) as [keyof Features, number][]) s += w * f[k];
  const h = ctx.signals.items.get(item.id);
  if (h) {
    const ignored = h.opens === 0 ? Math.max(0, h.impressions - seenLimit + 1) : 0;
    if (ignored > 0) s *= Math.pow(seenPenalty, ignored);
    if (h.saved || h.cooked) s *= ownedPenalty;
  }
  // A hair of seeded noise breaks ties the same way all day.
  return s + jitter(ctx.input.seed, item.id) * 1e-4;
}
