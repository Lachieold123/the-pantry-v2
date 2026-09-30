// The cook's edits to a week's shopping list, and the rules that decide
// whether an edit still applies. The list itself is derived from the plan
// (derive.ts); these edits are the only thing stored.
//
// The rules (D-010, F11–F13, F19):
// - A tick records how much was bought, in unit-free base amounts (grams,
//   millilitres, counts), and the meals it was bought for. It holds while
//   the week still needs no more than that, whatever the display units, and
//   while at least one of those meals is still planned. A day passing
//   changes neither.
// - A removal records the meals it applied to, and holds while the week's
//   meals for that line are a subset of them: dropping a meal keeps it
//   removed, adding one brings the line back.

import type { CupboardItem } from '../cupboard/match';
import { parseNumber } from '../ingredients/quantity';
import { UNITS, unitFromText } from '../ingredients/units';
import type { ISODate, PlanEntry } from '../plan/week';
import type { ShoppingItem, ShoppingList } from './derive';

export type ListExtra = { id: string; text: string; addedAt: number };

/** Amount per unit family ("mass", "volume", "count", "count:clove"), in base units. */
export type Need = Record<string, number>;

/** What a tick applied to: the amount bought and the plan entries (comma-joined) it was for. */
export type Tick = { need: Need; stamp: string };

/** The cook's edits to one week's list. */
export type WeekListEdits = {
  checked: Record<string, Tick>;
  /** key → the plan entries (comma-joined) it came from when removed. */
  removed: Record<string, string>;
  extras: ListExtra[];
  checkedExtras: string[];
};

export const EMPTY_EDITS: WeekListEdits = { checked: {}, removed: {}, extras: [], checkedExtras: [] };

const ids = (stamp: string): string[] => (stamp ? stamp.split(',') : []);

/** True when everything needed now fits inside what was bought. */
export function covers(bought: Need, need: Need): boolean {
  return Object.entries(need).every(([family, n]) => {
    const have = bought[family];
    return have !== undefined && n <= have * (1 + 1e-9) + 1e-9;
  });
}

/** The tick still belongs to this plan: at least one meal it was bought for is still planned. */
export function tickBelongs(tick: Tick | undefined, stamp: string): tick is Tick {
  if (!tick) return false;
  const now = new Set(ids(stamp));
  return ids(tick.stamp).some((id) => now.has(id));
}

export function removalHolds(removedStamp: string | undefined, stamp: string): boolean {
  if (removedStamp === undefined) return false;
  const was = new Set(ids(removedStamp));
  return ids(stamp).every((id) => was.has(id));
}

/** Tick or untick a line. The tick remembers how much was needed, so needing more later unticks it. */
export function toggleChecked(edits: WeekListEdits, item: ShoppingItem): WeekListEdits {
  const checked = { ...edits.checked };
  if (item.checked) delete checked[item.key];
  else checked[item.key] = { need: item.need, stamp: item.sourceStamp };
  return { ...edits, checked };
}

/**
 * Unticking undoes the move into the cupboard that ticking made (F14), but
 * only for an item that came from the shop: one the cook added by hand stays.
 */
export function untickLeavesCupboard(items: readonly CupboardItem[], key: string): boolean {
  return items.find((i) => i.ingredientId === key)?.source === 'shop';
}

export function removeItem(edits: WeekListEdits, item: ShoppingItem): WeekListEdits {
  return { ...edits, removed: { ...edits.removed, [item.key]: item.sourceStamp } };
}

export function restoreRemoved(edits: WeekListEdits): WeekListEdits {
  return { ...edits, removed: {} };
}

/** "Clear all": takes every line off and drops this week's extras. The caller keeps the old edits for undo. */
export function clearList(edits: WeekListEdits, list: ShoppingList): WeekListEdits {
  const removed = { ...edits.removed };
  for (const item of list.sections.flatMap((s) => s.items)) removed[item.key] = item.sourceStamp;
  return { ...edits, removed, extras: [], checkedExtras: [] };
}

export function toggleExtra(edits: WeekListEdits, id: string): WeekListEdits {
  const on = edits.checkedExtras.includes(id);
  return { ...edits, checkedExtras: on ? edits.checkedExtras.filter((x) => x !== id) : [...edits.checkedExtras, id] };
}

/** Deletes an extra and its tick, so nothing is left behind (F19). */
export function deleteExtra(edits: WeekListEdits, id: string): WeekListEdits {
  return { ...edits, extras: edits.extras.filter((x) => x.id !== id), checkedExtras: edits.checkedExtras.filter((x) => x !== id) };
}

/** Undo for deleteExtra: puts it back where it was, ticked if it was. */
export function restoreExtra(edits: WeekListEdits, extra: ListExtra, checked: boolean): WeekListEdits {
  if (edits.extras.some((x) => x.id === extra.id)) return edits;
  const extras = [...edits.extras, extra].sort((a, b) => a.addedAt - b.addedAt);
  return { ...edits, extras, checkedExtras: checked ? [...edits.checkedExtras, extra.id] : edits.checkedExtras };
}

/**
 * Adds free-text extras (for example the things a cupboard match is missing),
 * skipping any already on the list, whatever their case. Returns the edits and
 * the extras actually added, so the caller can offer undo.
 */
export function addExtras(
  edits: WeekListEdits,
  texts: readonly string[],
  makeId: () => string,
  now: number,
  alsoOnList: readonly string[] = [],
): { edits: WeekListEdits; added: ListExtra[] } {
  const onList = new Set([...edits.extras.map((x) => x.text), ...alsoOnList].map((t) => t.trim().toLowerCase()));
  const added: ListExtra[] = [];
  for (const raw of texts) {
    const text = raw.trim();
    if (!text || onList.has(text.toLowerCase())) continue;
    onList.add(text.toLowerCase());
    added.push({ id: makeId(), text, addedAt: now });
  }
  return { edits: added.length ? { ...edits, extras: [...edits.extras, ...added] } : edits, added };
}

export type CarriedExtra = { extra: ListExtra; fromWeek: ISODate };

/**
 * Extras typed onto a week that has ended and never ticked ("bin bags") come
 * forward to later weeks instead of vanishing with their week (F134). Worked
 * out when the list is, so nothing is copied. Ticking one in a later week
 * settles it: it stops coming forward after that week.
 */
export function carriedExtras(all: Readonly<Record<ISODate, WeekListEdits>>, week: ISODate, thisWeek: ISODate): CarriedExtra[] {
  const weeks = Object.keys(all).sort();
  const own = new Set((all[week]?.extras ?? []).map((x) => x.text.trim().toLowerCase()));
  const out: CarriedExtra[] = [];
  for (const origin of weeks.filter((w) => w < week && w < thisWeek)) {
    for (const extra of all[origin]?.extras ?? []) {
      const settled = weeks.some((w) => w >= origin && w < week && all[w]?.checkedExtras.includes(extra.id));
      const text = extra.text.trim().toLowerCase();
      if (settled || own.has(text)) continue;
      own.add(text);
      out.push({ extra, fromWeek: origin });
    }
  }
  return out;
}

const DISPLAY_ROUNDING = 1.05;
const COUNT_OR_MEASURE = /^(\S+?)(?:\s+(.+))?$/;

/**
 * Version 1 stored a tick as the amount text shown ("400 g + 2"). Read that
 * back into base amounts, tied to every meal planned that week. A tick that
 * can't be read is dropped: the item shows as to buy, which is the safe way
 * to be wrong.
 */
function tickFromText(text: string, stamp: string): Tick | undefined {
  const need: Need = {};
  for (const part of text.split(' + ').filter(Boolean)) {
    const match = COUNT_OR_MEASURE.exec(part.trim());
    const number = match?.[1]?.split('–').pop();
    const n = number === undefined ? undefined : parseNumber(number);
    if (n === undefined) return undefined;
    const unit = match?.[2] === undefined ? undefined : unitFromText(match[2]);
    if (match?.[2] !== undefined && unit === undefined) return undefined;
    const def = unit === undefined ? undefined : UNITS[unit];
    const family = unit === undefined ? 'count' : def?.kind === 'count' ? `count:${unit}` : (def?.kind ?? 'count');
    // The text was rounded for display ("1.1 lb" for 500 g), so allow for that rounding.
    need[family] = (need[family] ?? 0) + n * (def?.kind === 'count' ? 1 : (def?.base ?? 1)) * DISPLAY_ROUNDING;
  }
  return { need, stamp };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Brings saved list edits up to the current shape. Never throws: anything unreadable becomes empty. */
export function migrateListEdits(
  saved: unknown,
  entries: readonly PlanEntry[],
  weekOf: (day: ISODate) => ISODate,
): Record<ISODate, WeekListEdits> {
  if (!isRecord(saved)) return {};
  const safeWeekOf = (day: unknown): ISODate | undefined => {
    try {
      return typeof day === 'string' ? weekOf(day) : undefined;
    } catch {
      return undefined; // A garbled date belongs to no week.
    }
  };
  const out: Record<ISODate, WeekListEdits> = {};
  for (const [week, raw] of Object.entries(saved)) {
    if (!isRecord(raw)) continue;
    const stamp = entries
      .filter((e) => isRecord(e) && typeof e.id === 'string' && safeWeekOf(e.day) === week)
      .map((e) => e.id)
      .sort()
      .join(',');
    const checked: Record<string, Tick> = {};
    for (const [key, value] of Object.entries(isRecord(raw.checked) ? raw.checked : {})) {
      const tick =
        typeof value === 'string'
          ? tickFromText(value, stamp)
          : isRecord(value) && isRecord(value.need) && typeof value.stamp === 'string'
            ? (value as Tick)
            : undefined;
      if (tick) checked[key] = tick;
    }
    const removed = Object.fromEntries(
      Object.entries(isRecord(raw.removed) ? raw.removed : {}).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>;
    const extras = (Array.isArray(raw.extras) ? raw.extras : []).filter(
      (x): x is ListExtra => isRecord(x) && typeof x.id === 'string' && typeof x.text === 'string',
    );
    const checkedExtras = (Array.isArray(raw.checkedExtras) ? raw.checkedExtras : []).filter(
      (id): id is string => typeof id === 'string' && extras.some((x) => x.id === id),
    );
    out[week] = { checked, removed, extras, checkedExtras };
  }
  return out;
}
