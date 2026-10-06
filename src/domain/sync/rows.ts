// Turning what's on this phone into rows, and back (D-039, D-043). A change on
// one phone becomes a few changed rows; rows from another phone merge in by
// "newest wins"; and the stores are rebuilt from the rows. The same mechanism
// serves both scopes: a snapshot holds whichever parts a scope syncs (the
// kitchen, the personal side, or both), and only those become rows.
// Nothing here talks to the network.
import { kitchenFromRows, kitchenRecords, sameMeal, type SharedKitchen } from './kitchen';
import { collectionName, personalFromRows, personalRecords, type Personal } from './personal';
import { rowId, type Row, type RowKind } from './types';

export * from './kitchen';
export * from './personal';
export * from './types';

/** What one scope holds: the kitchen's fields, the personal fields, or both. Absent parts make no rows. */
export type Snapshot = Partial<SharedKitchen> & Partial<Personal>;

type Canon = { kind: RowKind; key: string; data: unknown };

const hasKitchen = (s: Snapshot) => s.entries !== undefined;
const hasPersonal = (s: Snapshot) => s.bookmarks !== undefined;

/** The snapshot as the set of live rows it implies, keyed by row id. */
export function canonicalRows(s: Snapshot): Map<string, Canon> {
  const out = new Map<string, Canon>();
  const put = (kind: RowKind, key: string, data: unknown) => out.set(rowId(kind, key), { kind, key, data });
  if (hasKitchen(s)) kitchenRecords({ entries: [], listEdits: {}, cupboard: [], recipes: {}, ...stripPersonal(s) }, put);
  if (hasPersonal(s))
    personalRecords(
      { bookmarks: [], collections: [], hidden: [], myRecipes: {}, recent: [], cookLog: [], prefs: {}, ...stripKitchen(s) },
      put,
    );
  return out;
}

function stripPersonal(s: Snapshot): Partial<SharedKitchen> {
  const { entries, listEdits, cupboard, recipes } = s;
  return {
    ...(entries ? { entries } : {}),
    ...(listEdits ? { listEdits } : {}),
    ...(cupboard ? { cupboard } : {}),
    ...(recipes ? { recipes } : {}),
  };
}
function stripKitchen(s: Snapshot): Partial<Personal> {
  const { bookmarks, collections, hidden, myRecipes, recent, cookLog, prefs } = s;
  return Object.fromEntries(
    Object.entries({ bookmarks, collections, hidden, myRecipes, recent, cookLog, prefs }).filter(([, v]) => v !== undefined),
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What changed between two snapshots, as rows stamped now. */
export function changedRows(before: Snapshot, after: Snapshot, now: number, by?: string): Row[] {
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

/**
 * Joining a household, or signing in to an account that already has things
 * in it: what's there comes first, and anything of yours it doesn't have yet
 * is added, so nothing is lost. Nothing is doubled either: the same meal
 * planned on both (same recipe, day and meal) is kept once, a Cookmark is
 * one per recipe, and a collection with the same name as one already there
 * adds its recipes to that one instead of making a second.
 */
export function rowsToBringAlong(mirror: Readonly<Record<string, Row>>, mine: Snapshot, now: number, by?: string): Row[] {
  const rows: Row[] = [];
  const stamp = (c: Canon): Row => ({ ...c, deleted: false, updatedAt: now, updatedBy: by });
  const live = Object.values(mirror);
  let pruned: Snapshot = mine;
  if (hasKitchen(mine)) {
    const planned = new Set(kitchenFromRows(live).entries.map(sameMeal));
    pruned = { ...pruned, entries: (mine.entries ?? []).filter((e) => !planned.has(sameMeal(e))) };
  }
  if (hasPersonal(mine)) {
    const theirs = new Map(personalFromRows(live).collections.map((c) => [collectionName(c.name), c]));
    const kept = [];
    for (const c of mine.collections ?? []) {
      const match = theirs.get(collectionName(c.name));
      if (!match || match.id === c.id) {
        kept.push(c);
        continue;
      }
      const added = c.recipeIds.filter((id) => !match.recipeIds.includes(id));
      if (!added.length) continue;
      const recipeIds = [...match.recipeIds, ...added];
      rows.push(
        stamp({ kind: 'collection', key: match.id, data: { name: match.name, recipeIds, createdAt: match.createdAt, updatedAt: now } }),
      );
    }
    pruned = { ...pruned, collections: kept };
  }
  // A record removed elsewhere but still on this phone comes back: this phone's copy is the one in front of you.
  for (const [id, c] of canonicalRows(pruned)) {
    if (!mirror[id] || mirror[id].deleted) rows.push(stamp(c));
  }
  return rows;
}
