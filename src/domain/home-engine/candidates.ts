// Stage 1: candidate generation. Several cheap sources each put forward their
// best few, like the "inventory" stage the big feeds describe; the union goes
// on to ranking with each item remembering which sources picked it.
import { jitter, type Context } from './context';
import { collabScore, cosine, decay, itemVector, pantryShare } from './features';
import type { EngineItem, Source } from './types';

export type Candidates = Map<string, Source[]>;

const top = (items: EngineItem[], score: (i: EngineItem) => number, n: number): EngineItem[] =>
  items
    .map((item) => ({ item, s: score(item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.id.localeCompare(b.item.id))
    .slice(0, n)
    .map((x) => x.item);

/** Followed cooks' recipes, newest first. */
function following(ctx: Context): EngineItem[] {
  const mine = ctx.pool.filter((i) => ctx.follows.has(i.cookId));
  return top(mine, (i) => i.publishedAt + 1, ctx.config.sourceLimits.following);
}

/** What the cupboard nearly or fully covers, best covered first. */
function cookable(ctx: Context): EngineItem[] {
  const { cookableMinShare, cookableMaxMissing, sourceLimits } = ctx.config;
  return top(
    ctx.pool,
    (i) => {
      const m = ctx.pantry.get(i.id);
      if (!m || m.have === 0) return 0;
      return pantryShare(m) >= cookableMinShare || m.missing.length <= cookableMaxMissing ? pantryShare(m) + 0.01 : 0;
    },
    sourceLimits.cookable,
  );
}

/** Like what the viewer liked: content similarity, or "people who saved X saved this". */
function similar(ctx: Context): EngineItem[] {
  if (ctx.profile.size === 0 && ctx.liked.length === 0) return [];
  const liked = new Set(ctx.liked);
  return top(
    ctx.pool.filter((i) => !liked.has(i.id)),
    (i) => Math.max(cosine(ctx.profile, itemVector(i)), collabScore(ctx.co, ctx.liked, i.id).score),
    ctx.config.sourceLimits.similar,
  );
}

/** Popular lately (decayed engagement). With no events yet, good cooks' newest posts stand in. */
function popular(ctx: Context): EngineItem[] {
  const { sourceLimits, freshnessHalfLifeHours } = ctx.config;
  if (ctx.popularity.size > 0) return top(ctx.pool, (i) => ctx.popularity.get(i.id) ?? 0, sourceLimits.popular);
  const now = ctx.input.now;
  return top(ctx.pool, (i) => (i.authorQuality ?? 0.5) * decay(now - i.publishedAt, freshnessHalfLifeHours * 2), sourceLimits.popular);
}

function fresh(ctx: Context): EngineItem[] {
  return top(ctx.pool, (i) => i.publishedAt + 1, ctx.config.sourceLimits.fresh);
}

/**
 * A seeded handful from outside everything else, leaning to cuisines the
 * viewer hasn't shown interest in, so the profile can learn something new.
 */
function explore(ctx: Context, taken: ReadonlySet<string>): EngineItem[] {
  const rest = ctx.pool.filter((i) => !ctx.follows.has(i.cookId));
  return top(
    rest,
    (i) => {
      const known = ctx.profile.get(`cuisine:${i.cuisine}`) ?? 0;
      // Items no other source picked come first; the rest still qualify, so there's always something to explore.
      return 0.01 + jitter(ctx.input.seed, i.id) / (1 + known) + (taken.has(i.id) ? 0 : 1);
    },
    ctx.config.sourceLimits.explore,
  );
}

export function generateCandidates(ctx: Context): Candidates {
  const out: Candidates = new Map();
  const add = (source: Source, items: EngineItem[]) => {
    for (const i of items) {
      const list = out.get(i.id) ?? [];
      if (!list.includes(source)) list.push(source);
      out.set(i.id, list);
    }
  };
  add('following', following(ctx));
  add('cookable', cookable(ctx));
  add('similar', similar(ctx));
  add('popular', popular(ctx));
  add('fresh', fresh(ctx));
  add('explore', explore(ctx, new Set(out.keys())));
  return out;
}
