// The kitchen as rows (D-039): a planned meal, a tick on the list, a removal,
// an extra, a cupboard jar, and (in a household) a planned recipe of your own.
// The kitchen is the part that moves between scopes: it syncs with the
// household when you're in one, and with your account when you're not (D-043).
import type { CupboardItem } from '../cupboard/match';
import type { ISODate, PlanEntry } from '../plan/week';
import { EMPTY_EDITS, type ListExtra, type WeekListEdits } from '../shopping/derive';
import type { Row } from './types';

/** The plan, the list's edits and the cupboard. Recipes are your own, keyed by id, as stored. */
export type SharedKitchen = {
  entries: readonly PlanEntry[];
  listEdits: Readonly<Record<ISODate, WeekListEdits>>;
  cupboard: readonly CupboardItem[];
  recipes: Readonly<Record<string, unknown>>;
};

export const EMPTY_KITCHEN: SharedKitchen = { entries: [], listEdits: {}, cupboard: [], recipes: {} };

/** Week and list key share one row key; a list key can't contain "|" (ingredient ids and "text:…"). */
const weekKey = (week: string, key: string) => `${week}|${key}`;
const splitWeekKey = (k: string): [string, string] => {
  const at = k.indexOf('|');
  return at < 0 ? ['', ''] : [k.slice(0, at), k.slice(at + 1)];
};

type Put = (kind: Row['kind'], key: string, data: unknown) => void;

/** Calls `put` once for each record the kitchen holds. */
export function kitchenRecords(k: SharedKitchen, put: Put): void {
  for (const e of k.entries) put('plan', e.id, { recipeId: e.recipeId, day: e.day, slot: e.slot, servings: e.servings });
  for (const [week, edits] of Object.entries(k.listEdits)) {
    for (const [key, amount] of Object.entries(edits.checked)) put('tick', weekKey(week, key), { amount });
    for (const [key, stamp] of Object.entries(edits.removed)) put('removal', weekKey(week, key), { stamp });
    for (const x of edits.extras) put('extra', x.id, { ...x, week, checked: edits.checkedExtras.includes(x.id) });
  }
  for (const i of k.cupboard) put('cupboard', i.ingredientId, { addedAt: i.addedAt, source: i.source });
  for (const [id, recipe] of Object.entries(k.recipes)) put('recipe', id, recipe);
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

/** The same meal (recipe, day and meal of the day), wherever it was planned. */
export const sameMeal = (e: Pick<PlanEntry, 'recipeId' | 'day' | 'slot'>) => `${e.recipeId}|${e.day}|${e.slot}`;

/** Your own recipes that the shared plan uses: the only ones a household sees. */
export function plannedOwnRecipes(entries: readonly PlanEntry[], own: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const e of entries) {
    const r = own[e.recipeId];
    if (r !== undefined) out[e.recipeId] = r;
  }
  return out;
}
