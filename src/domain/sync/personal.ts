// Everything personal as rows (D-043): Cookmarks, collections, hidden dishes,
// your own recipes, recently viewed, the cooking log and the settings that
// travel with you. These always sync with your account, never a household.
//
// Row keys are each record's own id, so two phones adding different things
// never clobber each other: a Cookmark is keyed by its recipe, a collection
// and a cooked dish by their ids, a setting by its name. Recently viewed is
// one row, because it's an ordered list of twenty with no times to merge by.
import type { CookEvent } from '../cook/cook';
import type { Row } from './types';

export type SyncBookmark = { recipeId: string; savedAt: number };
export type SyncCollection = { id: string; name: string; recipeIds: readonly string[]; createdAt: number; updatedAt: number };

/**
 * Settings that follow you to a new phone, by name. Taste (diet, leave-outs,
 * cuisines, weeknight time), units and the cupboard's shelf are about you and
 * your kitchen. The theme, high contrast and the Sunday reminder stay on each
 * phone: the first two suit the screen and the eyes in front of it, and the
 * reminder is a notification only this phone can schedule, so syncing it
 * would show "on" on a phone that never asked permission.
 */
export const SYNCED_PREFS = ['diet', 'avoid', 'cuisines', 'weeknight', 'units', 'shelf', 'moveTicked'] as const;
export type SyncedPref = (typeof SYNCED_PREFS)[number];

export type Personal = {
  bookmarks: readonly SyncBookmark[];
  collections: readonly SyncCollection[];
  hidden: readonly string[];
  /** Your own recipes, keyed by id, as stored. */
  myRecipes: Readonly<Record<string, unknown>>;
  recent: readonly string[];
  cookLog: readonly CookEvent[];
  /** Only the settings that have a value; `undefined` (no weeknight limit) is stored as null. */
  prefs: Readonly<Partial<Record<SyncedPref, unknown>>>;
};

export const EMPTY_PERSONAL: Personal = { bookmarks: [], collections: [], hidden: [], myRecipes: {}, recent: [], cookLog: [], prefs: {} };

type Put = (kind: Row['kind'], key: string, data: unknown) => void;

/** The one key recently viewed is stored under. */
export const RECENT_KEY = 'list';

export function personalRecords(p: Personal, put: Put): void {
  for (const b of p.bookmarks) put('bookmark', b.recipeId, { savedAt: b.savedAt });
  for (const c of p.collections)
    put('collection', c.id, { name: c.name, recipeIds: [...c.recipeIds], createdAt: c.createdAt, updatedAt: c.updatedAt });
  for (const id of p.hidden) put('hidden', id, {});
  for (const [id, recipe] of Object.entries(p.myRecipes)) put('myrecipe', id, recipe);
  if (p.recent.length) put('recent', RECENT_KEY, { ids: [...p.recent] });
  for (const e of p.cookLog) put('cooklog', e.id, { recipeId: e.recipeId, cookedAt: e.cookedAt });
  for (const name of SYNCED_PREFS) if (name in p.prefs) put('prefs', name, { value: p.prefs[name] ?? null });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Rebuilds the personal side from rows, skipping any that don't make sense. Only settings with a row appear in `prefs`. */
export function personalFromRows(rows: Iterable<Row>): Personal {
  const out = {
    bookmarks: [] as SyncBookmark[],
    collections: [] as SyncCollection[],
    hidden: [] as string[],
    myRecipes: {} as Record<string, unknown>,
    recent: [] as string[],
    cookLog: [] as CookEvent[],
    prefs: {} as Partial<Record<SyncedPref, unknown>>,
  };
  for (const r of rows) {
    if (r.deleted || !isObj(r.data)) continue;
    const d = r.data;
    if (r.kind === 'bookmark') {
      out.bookmarks.push({ recipeId: r.key, savedAt: typeof d.savedAt === 'number' ? d.savedAt : r.updatedAt });
    } else if (r.kind === 'collection') {
      if (typeof d.name !== 'string') continue;
      const createdAt = typeof d.createdAt === 'number' ? d.createdAt : r.updatedAt;
      const updatedAt = typeof d.updatedAt === 'number' ? d.updatedAt : createdAt;
      out.collections.push({ id: r.key, name: d.name, recipeIds: strings(d.recipeIds), createdAt, updatedAt });
    } else if (r.kind === 'hidden') {
      out.hidden.push(r.key);
    } else if (r.kind === 'myrecipe') {
      out.myRecipes[r.key] = d;
    } else if (r.kind === 'recent') {
      out.recent = strings(d.ids);
    } else if (r.kind === 'cooklog') {
      if (typeof d.recipeId !== 'string' || typeof d.cookedAt !== 'number') continue;
      out.cookLog.push({ id: r.key, recipeId: d.recipeId, cookedAt: d.cookedAt });
    } else if (r.kind === 'prefs') {
      if ((SYNCED_PREFS as readonly string[]).includes(r.key) && 'value' in d) out.prefs[r.key as SyncedPref] = d.value;
    }
  }
  // The same order the stores keep: newest Cookmark first, collections and the log oldest first.
  out.bookmarks.sort((a, b) => b.savedAt - a.savedAt || a.recipeId.localeCompare(b.recipeId));
  out.collections.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  out.hidden.sort();
  out.cookLog.sort((a, b) => a.cookedAt - b.cookedAt || a.id.localeCompare(b.id));
  return out;
}

/** A collection's name as two phones would both mean it: "Weeknights" and " weeknights" are one collection. */
export const collectionName = (name: string) => name.trim().toLowerCase();
