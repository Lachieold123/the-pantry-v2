// The simulation harness's pure half: synthetic viewers with a hidden taste,
// a pantry and follows among the cooks; a click model that turns a feed into
// events; and the metrics the report prints. scripts/home-engine-sim.mts
// feeds it the real published recipes (read only) and writes the report.
// This is test tooling: nothing here ships to a screen.
import { pantryMatch, pantryShare } from './features';
import type { EngineEvent, EngineItem, RankedItem, Viewer } from './types';

/** Seeded random numbers (mulberry32), so a run can be repeated exactly. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

/** What the simulated person really likes. The engine never sees this. */
export type HiddenTaste = { cuisines: Set<string>; quick: boolean; vegetarian: boolean };
export type SimViewer = { viewer: Viewer; taste: HiddenTaste; label: string };

export type SimWorld = { items: readonly EngineItem[]; cookIds: readonly string[] };

/**
 * A synthetic viewer: two or three favourite cuisines, a cupboard stocked from
 * recipes in those cuisines, and follows leaning to cooks who post them.
 */
export function makeViewer(world: SimWorld, index: number, r: () => number): SimViewer {
  const cuisines = [...new Set(world.items.map((i) => i.cuisine).filter(Boolean))].sort();
  const fav = new Set<string>();
  const want = 2 + Math.floor(r() * 2);
  while (fav.size < Math.min(want, cuisines.length)) fav.add(pick(r, cuisines));
  const vegetarian = r() < 0.15;
  const quick = r() < 0.4;
  const theirs = world.items.filter((i) => fav.has(i.cuisine));
  const pantry = new Set<string>();
  const stockFrom = Math.max(1, Math.floor(theirs.length * (0.05 + r() * 0.1)));
  for (let k = 0; k < stockFrom; k++)
    for (const id of pick(r, theirs.length ? theirs : world.items).needIds) if (r() < 0.75) pantry.add(id);
  const cooksOfFav = [...new Set(theirs.map((i) => i.cookId))];
  const follows = new Set<string>();
  const nFollow = Math.floor(r() * 12);
  for (let k = 0; k < nFollow; k++) follows.add(r() < 0.7 && cooksOfFav.length ? pick(r, cooksOfFav) : pick(r, world.cookIds));
  const viewer: Viewer = {
    id: `sim-${index}`,
    follows,
    pantry,
    events: [],
    ...(vegetarian ? { dietAnyOf: ['vegetarian', 'vegan'] } : {}),
    ...(r() < 0.5 ? { likedCuisines: [...fav].slice(0, 1) } : {}),
  };
  return {
    viewer,
    taste: { cuisines: fav, quick, vegetarian },
    label: `${[...fav].join('+')}${quick ? ', quick' : ''}${vegetarian ? ', veg' : ''}`,
  };
}

/** The hidden utility of one item for one simulated viewer. */
export function utility(sim: SimViewer, item: EngineItem): number {
  let u = sim.taste.cuisines.has(item.cuisine) ? 1.6 : 0;
  if (sim.viewer.follows.has(item.cookId)) u += 0.8;
  u += 1.4 * pantryShare(pantryMatch(item, sim.viewer.pantry));
  if (sim.taste.quick && item.totalMinutes !== undefined && item.totalMinutes <= 30) u += 0.6;
  return u;
}

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Scrolls a feed: impressions for each shown item, then opens, dwells, saves, cooks, likes, hides. */
export function interact(sim: SimViewer, feed: readonly RankedItem[], now: number, r: () => number): EngineEvent[] {
  const out: EngineEvent[] = [];
  const viewerId = sim.viewer.id;
  feed.forEach((ranked, position) => {
    const item = ranked.item;
    const at = now + position * 1000;
    out.push({ type: 'impression', at, viewerId, itemId: item.id, surface: 'home' });
    const u = utility(sim, item);
    // People look less far down the page (position bias).
    const look = 1 / (1 + position * 0.08);
    if (r() < sig(u - 2.2) * look) {
      out.push({ type: 'open', at: at + 1, viewerId, itemId: item.id });
      out.push({ type: 'dwell', at: at + 2, viewerId, itemId: item.id, seconds: Math.round(10 + 60 * sig(u - 1.5) * r()) });
      if (r() < sig(u - 2.0)) out.push({ type: 'save', at: at + 3, viewerId, itemId: item.id });
      if (r() < sig(u - 2.6)) out.push({ type: 'cook', at: at + 4, viewerId, itemId: item.id });
      if (r() < sig(u - 1.8)) out.push({ type: 'like', at: at + 5, viewerId, itemId: item.id });
    } else if (u < 0.3 && r() < 0.04) {
      out.push({ type: 'hide', at: at + 1, viewerId, itemId: item.id });
    }
  });
  return out;
}

export type FeedMetrics = {
  followedShare: number;
  avgPantryShare: number;
  distinctCooks: number;
  distinctCuisines: number;
  longestCookRun: number;
  tasteShare: number;
  violations: number;
};

/** Metrics for one viewer's top of feed. */
export function feedMetrics(sim: SimViewer, feed: readonly RankedItem[]): FeedMetrics {
  const n = feed.length || 1;
  let run = 0;
  let longest = 0;
  feed.forEach((f, i) => {
    run = i > 0 && feed[i - 1]!.item.cookId === f.item.cookId ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  const blockedDiet = (i: EngineItem) => sim.viewer.dietAnyOf?.length && !i.diets.some((d) => sim.viewer.dietAnyOf!.includes(d));
  return {
    followedShare: feed.filter((f) => sim.viewer.follows.has(f.item.cookId)).length / n,
    avgPantryShare: feed.reduce((s, f) => s + pantryShare(pantryMatch(f.item, sim.viewer.pantry)), 0) / n,
    distinctCooks: new Set(feed.map((f) => f.item.cookId)).size,
    distinctCuisines: new Set(feed.map((f) => f.item.cuisine)).size,
    longestCookRun: longest,
    tasteShare: feed.filter((f) => sim.taste.cuisines.has(f.item.cuisine)).length / n,
    violations: feed.filter((f) => blockedDiet(f.item)).length,
  };
}

export function mean(list: readonly number[]): number {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
}

/** A plain newest-first feed, the baseline the engine is compared with. Diet still applies. */
export function chronological(items: readonly EngineItem[], viewer: Viewer, limit: number): RankedItem[] {
  return items
    .filter((i) => !viewer.dietAnyOf?.length || i.diets.some((d) => viewer.dietAnyOf!.includes(d)))
    .sort((a, b) => b.publishedAt - a.publishedAt || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => ({
      item,
      score: 0,
      sources: ['fresh'],
      features: { follow: 0, affinity: 0, pantry: 0, similarity: 0, collab: 0, popularity: 0, freshness: 1, quality: 0.5, quick: 0 },
      predictions: { save: 0, cook: 0, like: 0, dwell: 0 },
      pantry: pantryMatch(item, viewer.pantry),
      reasons: [],
      explanation: '',
    }));
}
