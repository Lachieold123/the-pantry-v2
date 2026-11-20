// Stage 0: everything the stages share, worked out once per request. Hard
// filters (diet, allergens, hidden) run here, before any candidate is made,
// so nothing downstream can let a blocked recipe back in.
import { DEFAULT_CONFIG, type EngineConfig } from './config';
import { effectiveFollows, summarise, type ViewerSignals } from './events';
import { coOccurrence, pantryMatch, popularity, tasteProfile, type CoOccurrence, type Vector } from './features';
import type { EngineEvent, EngineItem, PantryMatch, Viewer } from './types';

export type EngineInput = {
  items: readonly EngineItem[];
  viewer: Viewer;
  now: number;
  /** Ties and exploration are stable for the same seed (the app uses today's date). */
  seed: string;
  /** Everyone's events, for popularity and co-occurrence. The viewer's own are always included. */
  globalEvents?: readonly EngineEvent[];
  config?: EngineConfig;
  /** The app's own cupboard matcher (swaps, shelf). Defaults to a plain id match. */
  pantryOf?: (item: EngineItem) => PantryMatch;
  /** Ingredient names for "Need 2: lemon, feta". Defaults to the id. */
  nameOf?: (ingredientId: string) => string;
  /** How many to return. Defaults to every eligible item. */
  limit?: number;
};

export type Context = {
  input: EngineInput;
  config: EngineConfig;
  byId: Map<string, EngineItem>;
  /** Items that pass the hard filters. */
  pool: EngineItem[];
  signals: ViewerSignals;
  follows: Set<string>;
  profile: Vector;
  /** Items the viewer liked, saved or cooked, strongest first. */
  liked: string[];
  popularity: Map<string, number>;
  co: CoOccurrence;
  pantry: Map<string, PantryMatch>;
};

/** True when the viewer may never be shown this item. */
export function blocked(item: EngineItem, viewer: Viewer, hidden: ReadonlySet<string>): boolean {
  if (hidden.has(item.id)) return true;
  if (viewer.dietAnyOf?.length && !item.diets.some((d) => viewer.dietAnyOf!.includes(d))) return true;
  const avoid = viewer.avoidIngredientIds;
  if (avoid?.size && item.ingredientIds.some((id) => avoid.has(id))) return true;
  return false;
}

export function buildContext(input: EngineInput): Context {
  const config = input.config ?? DEFAULT_CONFIG;
  const byId = new Map(input.items.map((i) => [i.id, i]));
  const cookOf = (id: string) => byId.get(id)?.cookId;
  const signals = summarise(input.viewer.events, config, cookOf);
  const hidden = new Set([...signals.items].filter(([, h]) => h.hidden).map(([id]) => id));
  const pool = input.items.filter((i) => !blocked(i, input.viewer, hidden));
  const liked = [...signals.itemWeight]
    .filter(([id, w]) => w >= 2 && byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([id]) => id);
  // The viewer's own events always count, even when the server's set is missing.
  const global = input.globalEvents ? [...input.globalEvents] : [];
  const ownIncluded = input.globalEvents?.some((e) => e.viewerId === input.viewer.id) ?? false;
  if (!ownIncluded) global.push(...input.viewer.events);
  const match = input.pantryOf ?? ((item: EngineItem) => pantryMatch(item, input.viewer.pantry));
  return {
    input,
    config,
    byId,
    pool,
    signals,
    follows: effectiveFollows(input.viewer.follows, signals),
    profile: tasteProfile(signals.itemWeight, byId, input.viewer.likedCuisines),
    liked,
    popularity: popularity(global, input.now, config),
    co: coOccurrence(global),
    pantry: new Map(pool.map((i) => [i.id, match(i)])),
  };
}

/** A stable 0..1 number per (seed, id), for tie-breaks and exploration. */
export function jitter(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0xffffffff;
}
