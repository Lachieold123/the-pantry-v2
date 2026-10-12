// The interaction log and what the engine reads from it. The app keeps the log
// on the phone for now (store/homeEvents.ts); the same events go to the
// server's home_events table later (supabase/migrations, not applied).
import type { EngineConfig } from './config';
import type { EngineEvent, EventType } from './types';

export const EVENT_TYPES: readonly EventType[] = [
  'impression',
  'open',
  'dwell',
  'save',
  'unsave',
  'cook',
  'like',
  'follow',
  'unfollow',
  'hide',
];

/** The log keeps this many events, newest kept. */
export const LOG_MAX = 3000;
/** ...and nothing older than this. */
export const LOG_MAX_AGE_MS = 90 * 24 * 3600 * 1000;
/** A second impression of the same item within this window is the same look, not a new one. */
export const IMPRESSION_DEDUPE_MS = 30 * 60 * 1000;

export function isEvent(raw: unknown): raw is EngineEvent {
  if (typeof raw !== 'object' || raw === null) return false;
  const e = raw as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    (EVENT_TYPES as readonly string[]).includes(e.type) &&
    typeof e.at === 'number' &&
    Number.isFinite(e.at) &&
    typeof e.viewerId === 'string' &&
    (e.itemId === undefined || typeof e.itemId === 'string') &&
    (e.cookId === undefined || typeof e.cookId === 'string') &&
    (e.seconds === undefined || (typeof e.seconds === 'number' && e.seconds >= 0))
  );
}

/**
 * Adds an event, dropping repeat impressions and trimming the log by count
 * and age. Returns the same array when nothing changes.
 */
export function appendEvent(log: readonly EngineEvent[], event: EngineEvent, now: number = event.at): EngineEvent[] {
  if (!isEvent(event)) return log as EngineEvent[];
  if (event.type === 'impression') {
    const repeat = log.some(
      (e) =>
        e.type === 'impression' && e.itemId === event.itemId && e.viewerId === event.viewerId && event.at - e.at < IMPRESSION_DEDUPE_MS,
    );
    if (repeat) return log as EngineEvent[];
  }
  const kept = log.filter((e) => now - e.at <= LOG_MAX_AGE_MS);
  kept.push(event);
  return kept.length > LOG_MAX ? kept.slice(kept.length - LOG_MAX) : kept;
}

/** What one viewer has done with one item. */
export type ItemHistory = {
  impressions: number;
  opens: number;
  dwellSeconds: number;
  saved: boolean;
  cooked: boolean;
  liked: boolean;
  hidden: boolean;
};

export type ViewerSignals = {
  items: Map<string, ItemHistory>;
  /** Net taste weight per item: the positive ones seed "similar to what you liked". */
  itemWeight: Map<string, number>;
  /** Interaction weight per cook (opens, saves, cooks of their recipes). */
  cookWeight: Map<string, number>;
  /** Follow and unfollow events, latest wins. */
  followChanges: Map<string, boolean>;
};

const blank = (): ItemHistory => ({ impressions: 0, opens: 0, dwellSeconds: 0, saved: false, cooked: false, liked: false, hidden: false });

/** Folds a viewer's events into per-item and per-cook signals. `cookOf` finds an item's cook. */
export function summarise(
  events: readonly EngineEvent[],
  config: EngineConfig,
  cookOf: (itemId: string) => string | undefined,
): ViewerSignals {
  const items = new Map<string, ItemHistory>();
  const itemWeight = new Map<string, number>();
  const cookWeight = new Map<string, number>();
  const followChanges = new Map<string, boolean>();
  const sorted = [...events].sort((a, b) => a.at - b.at);
  for (const e of sorted) {
    if (e.type === 'follow' || e.type === 'unfollow') {
      if (e.cookId) followChanges.set(e.cookId, e.type === 'follow');
      continue;
    }
    if (!e.itemId) continue;
    const h = items.get(e.itemId) ?? blank();
    items.set(e.itemId, h);
    if (e.type === 'impression') h.impressions++;
    else if (e.type === 'open') h.opens++;
    else if (e.type === 'dwell') h.dwellSeconds += e.seconds ?? 0;
    else if (e.type === 'save') h.saved = true;
    else if (e.type === 'unsave') h.saved = false;
    else if (e.type === 'cook') h.cooked = true;
    else if (e.type === 'like') h.liked = true;
    else if (e.type === 'hide') h.hidden = true;
    let w = config.eventWeights[e.type] ?? 0;
    if (e.type === 'dwell') w = Math.min(config.dwellCap, (e.seconds ?? 0) / 30);
    if (w === 0) continue;
    itemWeight.set(e.itemId, (itemWeight.get(e.itemId) ?? 0) + w);
    const cook = e.cookId ?? cookOf(e.itemId);
    if (cook) cookWeight.set(cook, (cookWeight.get(cook) ?? 0) + w);
  }
  return { items, itemWeight, cookWeight, followChanges };
}

/** The viewer's follows with their logged follow and unfollow taps applied on top. */
export function effectiveFollows(base: ReadonlySet<string>, signals: ViewerSignals): Set<string> {
  const out = new Set(base);
  for (const [cook, on] of signals.followChanges) {
    if (on) out.add(cook);
    else out.delete(cook);
  }
  return out;
}
