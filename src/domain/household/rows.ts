// A household's shared kitchen as rows (D-039). Each record (a planned meal,
// a tick on the list, a removal, an extra, a cupboard jar, a planned recipe
// of your own) is one row. A change on one phone becomes a few changed rows;
// rows from another phone merge in by "newest wins"; and the kitchen is
// rebuilt from the rows. Nothing here talks to the network.
import type { CupboardItem } from '../cupboard/match';
import type { ISODate, PlanEntry } from '../plan/week';
import { EMPTY_EDITS, type ListExtra, type WeekListEdits } from '../shopping/derive';

export type RowKind = 'plan' | 'tick' | 'removal' | 'extra' | 'cupboard' | 'recipe';

export type Row = {
  kind: RowKind;
  key: string;
  data: unknown;
  /** Removed (an entry deleted, a tick undone). Kept as a row so the removal syncs. */
  deleted: boolean;
  /** Milliseconds; the newest wins. */
  updatedAt: number;
  updatedBy?: string | undefined;
};

/** Everything a household shares. Recipes are your own, keyed by id, as stored. */
export type SharedKitchen = {
  entries: readonly PlanEntry[];
  listEdits: Readonly<Record<ISODate, WeekListEdits>>;
  cupboard: readonly CupboardItem[];
  recipes: Readonly<Record<string, unknown>>;
};

export const EMPTY_KITCHEN: SharedKitchen = { entries: [], listEdits: {}, cupboard: [], recipes: {} };

export const rowId = (kind: RowKind, key: string) => `${kind}:${key}`;
/** Week and list key share one row key; a list key can't contain "|" (ingredient ids and "text:…"). */
const weekKey = (week: string, key: string) => `${week}|${key}`;
const splitWeekKey = (k: string): [string, string] => {
  const at = k.indexOf('|');
  return at < 0 ? ['', ''] : [k.slice(0, at), k.slice(at + 1)];
};

type Canon = { kind: RowKind; key: string; data: unknown };

/** The kitchen as the set of live rows it implies, keyed by row id. */
export function canonicalRows(k: SharedKitchen): Map<string, Canon> {
  const out = new Map<string, Canon>();
  const put = (kind: RowKind, key: string, data: unknown) => out.set(rowId(kind, key), { kind, key, data });
  for (const e of k.entries) put('plan', e.id, { recipeId: e.recipeId, day: e.day, slot: e.slot, servings: e.servings });
  for (const [week, edits] of Object.entries(k.listEdits)) {
    for (const [key, amount] of Object.entries(edits.checked)) put('tick', weekKey(week, key), { amount });
    for (const [key, stamp] of Object.entries(edits.removed)) put('removal', weekKey(week, key), { stamp });
    for (const x of edits.extras) put('extra', x.id, { ...x, week, checked: edits.checkedExtras.includes(x.id) });
  }
  for (const i of k.cupboard) put('cupboard', i.ingredientId, { addedAt: i.addedAt, source: i.source });
  for (const [id, recipe] of Object.entries(k.recipes)) put('recipe', id, recipe);
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What changed between two versions of the kitchen, as rows stamped now. */
export function changedRows(before: SharedKitchen, after: SharedKitchen, now: number, by?: string): Row[] {
  const prev = canonicalRows(before);
  const next = canonicalRows(after);
  const rows: Row[] = [];
  for (const [id, c] of next) {
    const was = prev.get(id);
    if (!was || !same(was.data, c.data)) rows.push({ ...c, deleted: false, updatedAt: now, updatedBy: by });
  }
  for (const [id, c] of prev) {
    if (!next.has(id)) rows.push({ kind: c.kind, key: c.key, data: null, deleted: true, updatedAt: now, updatedBy: by });
  }
  return rows;
}

/**
 * Merges incoming rows into the mirror: a row replaces the one it matches
 * only if it's newer (a tie goes to the larger author id, so every phone
 * agrees). Returns the same mirror when nothing changed.
 */
export function mergeRows(mirror: Readonly<Record<string, Row>>, incoming: readonly Row[]): Record<string, Row> {
  let out: Record<string, Row> | undefined;
  for (const row of incoming) {
    const id = rowId(row.kind, row.key);
    const have = (out ?? mirror)[id];
    const newer =
      !have || row.updatedAt > have.updatedAt || (row.updatedAt === have.updatedAt && (row.updatedBy ?? '') > (have.updatedBy ?? ''));
    if (!newer || (have && same(have, row))) continue;
    out ??= { ...mirror };
    out[id] = row;
  }
  return out ?? (mirror as Record<string, Row>);
}

const SLOTS = new Set(['breakfast', 'lunch', 'dinner']);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Rebuilds the kitchen from rows. Rows that don't make sense (another app version, a bad write) are skipped. */
export function kitchenFromRows(rows: Iterable<Row>): SharedKitchen {
  const entries: PlanEntry[] = [];
  const weeks: Record<string, WeekListEdits> = {};
  const week = (w: string) => (weeks[w] ??= { ...EMPTY_EDITS, checked: {}, removed: {}, extras: [], checkedExtras: [] });
  const cupboard: CupboardItem[] = [];
  const recipes: Record<string, unknown> = {};
  for (const r of rows) {
    if (r.deleted || !isObj(r.data)) continue;
    const d = r.data;
    if (r.kind === 'plan') {
      if (typeof d.recipeId !== 'string' || typeof d.day !== 'string' || !SLOTS.has(String(d.slot)) || typeof d.servings !== 'number')
        continue;
      entries.push({ id: r.key, recipeId: d.recipeId, day: d.day, slot: d.slot as PlanEntry['slot'], servings: d.servings });
    } else if (r.kind === 'tick' || r.kind === 'removal') {
      const [w, key] = splitWeekKey(r.key);
      const value = r.kind === 'tick' ? d.amount : d.stamp;
      if (!w || !key || typeof value !== 'string') continue;
      week(w)[r.kind === 'tick' ? 'checked' : 'removed'][key] = value;
    } else if (r.kind === 'extra') {
      if (typeof d.week !== 'string' || typeof d.text !== 'string') continue;
      const { week: w, checked, ...rest } = d;
      const extra = { ...rest, id: r.key, text: d.text, addedAt: typeof d.addedAt === 'number' ? d.addedAt : r.updatedAt } as ListExtra;
      week(w).extras.push(extra);
      if (checked === true) week(w).checkedExtras.push(r.key);
    } else if (r.kind === 'cupboard') {
      cupboard.push({
        ingredientId: r.key,
        addedAt: typeof d.addedAt === 'number' ? d.addedAt : r.updatedAt,
        source: (d.source as CupboardItem['source']) ?? 'manual',
      });
    } else if (r.kind === 'recipe') {
      recipes[r.key] = d;
    }
  }
  // A stable order, so the same rows always give the same kitchen.
  entries.sort((a, b) => (a.day === b.day ? a.id.localeCompare(b.id) : a.day.localeCompare(b.day)));
  for (const w of Object.values(weeks)) w.extras.sort((a, b) => a.addedAt - b.addedAt || a.id.localeCompare(b.id));
  cupboard.sort((a, b) => a.addedAt - b.addedAt || a.ingredientId.localeCompare(b.ingredientId));
  return { entries, listEdits: weeks, cupboard, recipes };
}

/**
 * Joining a household: the household's rows come first, and anything of yours
 * it doesn't have yet is added, so nobody's plan or cupboard is lost. The
 * same meal planned on both phones (same recipe, day and meal) is kept once.
 */
export function rowsToBringAlong(mirror: Readonly<Record<string, Row>>, mine: SharedKitchen, now: number, by?: string): Row[] {
  const theirs = kitchenFromRows(Object.values(mirror));
  const planned = new Set(theirs.entries.map((e) => `${e.recipeId}|${e.day}|${e.slot}`));
  const minePruned: SharedKitchen = { ...mine, entries: mine.entries.filter((e) => !planned.has(`${e.recipeId}|${e.day}|${e.slot}`)) };
  const rows: Row[] = [];
  for (const [id, c] of canonicalRows(minePruned)) {
    if (!mirror[id]) rows.push({ ...c, deleted: false, updatedAt: now, updatedBy: by });
  }
  return rows;
}

/** Your own recipes that the shared plan uses: the only ones a household sees. */
export function plannedOwnRecipes(entries: readonly PlanEntry[], own: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const e of entries) {
    const r = own[e.recipeId];
    if (r !== undefined) out[e.recipeId] = r;
  }
  return out;
}
