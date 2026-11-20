// The engine's features: pantry match, content similarity (a sparse "bag of
// traits" vector per recipe, compared by cosine), item-item co-occurrence
// ("cooks who saved this also saved"), popularity with time decay, and
// freshness. Each is 0..1. Simple and explainable on purpose: an embedding
// model can replace `itemVector` later without touching the ranker.
import type { EngineConfig } from './config';
import type { EngineEvent, EngineItem, PantryMatch } from './types';

export type Vector = Map<string, number>;

/** Default pantry match: how many of the needed ingredients are in the cupboard. */
export function pantryMatch(item: EngineItem, pantry: ReadonlySet<string>): PantryMatch {
  const missing = item.needIds.filter((id) => !pantry.has(id));
  return { have: item.needIds.length - missing.length, total: item.needIds.length, missing };
}

/** Share covered, 0..1. A recipe that uses nothing from the cupboard scores 0 even if it needs nothing. */
export function pantryShare(m: PantryMatch): number {
  return m.total === 0 || m.have === 0 ? 0 : m.have / m.total;
}

export function timeBucket(minutes: number | undefined): string {
  if (minutes === undefined) return 'unknown';
  if (minutes <= 20) return 'quick';
  if (minutes <= 45) return 'weeknight';
  if (minutes <= 90) return 'slow';
  return 'project';
}

/**
 * A recipe as weighted traits. Cuisine and time weigh most; the ingredient
 * list is spread so a 20-ingredient curry doesn't drown out its cuisine.
 */
const vectors = new WeakMap<EngineItem, Vector>();

export function itemVector(item: EngineItem): Vector {
  const known = vectors.get(item);
  if (known) return known;
  const v: Vector = new Map();
  vectors.set(item, v);
  if (item.cuisine) v.set(`cuisine:${item.cuisine}`, 1.0);
  for (const m of item.mealTypes) v.set(`meal:${m}`, 0.4);
  for (const d of item.diets) v.set(`diet:${d}`, 0.5);
  v.set(`time:${timeBucket(item.totalMinutes)}`, 0.5);
  v.set(`level:${item.difficulty}`, 0.3);
  const ingredientWeight = item.ingredientIds.length ? 1.2 / Math.sqrt(item.ingredientIds.length) : 0;
  for (const id of item.ingredientIds) v.set(`ing:${id}`, ingredientWeight);
  return v;
}

export function addInto(target: Vector, v: Vector, scale: number): void {
  for (const [k, x] of v) target.set(k, (target.get(k) ?? 0) + x * scale);
}

export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const x of a.values()) na += x * x;
  for (const x of b.values()) nb += x * x;
  if (na === 0 || nb === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, x] of small) dot += x * (big.get(k) ?? 0);
  return Math.max(0, dot / Math.sqrt(na * nb));
}

/**
 * The taste profile: liked items' vectors, weighted by how strongly they were
 * liked, plus sign-up cuisines as a weak seed. Negative weights (hides) only
 * subtract; the result keeps positive traits.
 */
export function tasteProfile(
  itemWeight: ReadonlyMap<string, number>,
  byId: ReadonlyMap<string, EngineItem>,
  likedCuisines: readonly string[] = [],
): Vector {
  const profile: Vector = new Map();
  for (const c of likedCuisines) profile.set(`cuisine:${c.toLowerCase()}`, 1.5);
  for (const [id, w] of itemWeight) {
    const item = byId.get(id);
    if (item) addInto(profile, itemVector(item), w);
  }
  for (const [k, x] of profile) if (x <= 0) profile.delete(k);
  return profile;
}

/** Halves every `halfLifeHours`. */
export function decay(ageMs: number, halfLifeHours: number): number {
  return Math.pow(0.5, Math.max(0, ageMs) / (halfLifeHours * 3600 * 1000));
}

const ENGAGED: ReadonlySet<string> = new Set(['save', 'cook', 'like']);
const POP_WEIGHT: Partial<Record<string, number>> = { open: 0.2, like: 1, save: 2, cook: 3 };

/** Decayed engagement per item across everyone, scaled 0..1 by log against the busiest item. */
export function popularity(events: readonly EngineEvent[], now: number, config: EngineConfig): Map<string, number> {
  const raw = new Map<string, number>();
  for (const e of events) {
    const w = POP_WEIGHT[e.type];
    if (!w || !e.itemId) continue;
    raw.set(e.itemId, (raw.get(e.itemId) ?? 0) + w * decay(now - e.at, config.popularityHalfLifeHours));
  }
  const top = Math.max(0, ...raw.values());
  const out = new Map<string, number>();
  if (top <= 0) return out;
  for (const [id, x] of raw) out.set(id, Math.log1p(x) / Math.log1p(top));
  return out;
}

/** Item-item co-occurrence: how often two items were engaged with by the same viewer. */
export type CoOccurrence = { pairs: Map<string, Map<string, number>>; counts: Map<string, number> };

export function coOccurrence(events: readonly EngineEvent[], maxPerViewer = 60): CoOccurrence {
  const byViewer = new Map<string, Set<string>>();
  for (const e of events) {
    if (!ENGAGED.has(e.type) || !e.itemId) continue;
    const s = byViewer.get(e.viewerId) ?? new Set<string>();
    byViewer.set(e.viewerId, s);
    if (s.size < maxPerViewer) s.add(e.itemId);
  }
  const pairs = new Map<string, Map<string, number>>();
  const counts = new Map<string, number>();
  for (const set of byViewer.values()) {
    const ids = [...set];
    for (const a of ids) {
      counts.set(a, (counts.get(a) ?? 0) + 1);
      const row = pairs.get(a) ?? new Map<string, number>();
      pairs.set(a, row);
      for (const b of ids) if (a !== b) row.set(b, (row.get(b) ?? 0) + 1);
    }
  }
  return { pairs, counts };
}

/**
 * Collaborative score for one candidate against the viewer's liked items:
 * the best cosine-normalised co-occurrence, and which liked item it came from.
 */
export function collabScore(co: CoOccurrence, liked: readonly string[], candidate: string): { score: number; via: string | undefined } {
  let best = 0;
  let via: string | undefined;
  const nc = co.counts.get(candidate) ?? 0;
  if (nc === 0) return { score: 0, via };
  for (const l of liked) {
    const together = co.pairs.get(l)?.get(candidate) ?? 0;
    if (!together) continue;
    const s = together / Math.sqrt(nc * (co.counts.get(l) ?? 1));
    if (s > best) {
      best = s;
      via = l;
    }
  }
  return { score: Math.min(1, best), via };
}
