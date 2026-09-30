// Folding an old-app import into what's already in v2, and deciding when the
// import runs. Pure, so the store only moves data around. Every merge here
// only adds what's missing, so running the import again never duplicates
// anything (audit F07).

import type { CookEvent } from '../cook/cook';

/**
 * Bump when the importer changes in a way that should reach people who
 * already ran an older one (D-005). 1 was the first importer, which read field
 * names the old app never wrote (audit F09); its markers had no version.
 */
export const IMPORT_VERSION = 2;

/** Whether to run the import, given the marker left by the last run (if any). */
export function shouldImport(markerRaw: string | null): { run: boolean; importedBefore: boolean } {
  if (!markerRaw) return { run: true, importedBefore: false };
  let marker: unknown;
  try {
    marker = JSON.parse(markerRaw);
  } catch {
    return { run: true, importedBefore: false };
  }
  const m = typeof marker === 'object' && marker !== null ? (marker as { version?: unknown; imported?: unknown }) : {};
  const version = typeof m.version === 'number' ? m.version : 1;
  return { run: version < IMPORT_VERSION, importedBefore: m.imported === true };
}

/**
 * Keys a "start again" wipe of v2's storage may remove. Everything under v2's
 * prefix except the import marker: without the marker, the next launch would
 * find the old app's data (never deleted) and import it all over again, undoing
 * the wipe (audit F214). Any future wipe (sign out, delete account, reset) must
 * go through this, or remove the old app's keys as well.
 */
export function wipeableKeys(allKeys: readonly string[], prefix: string, markerKey: string): string[] {
  return allKeys.filter((k) => k.startsWith(`${prefix}/`) && k !== markerKey);
}

export type Bookmark = { recipeId: string; savedAt: number };

/**
 * Old favourites go after the ones already saved here (they're older), newest
 * first, with dates that keep that order.
 */
export function mergeBookmarks(existing: readonly Bookmark[], newestFirst: readonly string[], now: number): Bookmark[] {
  const have = new Set(existing.map((b) => b.recipeId));
  const oldest = Math.min(now, ...existing.map((b) => b.savedAt));
  const added = newestFirst.filter((id) => !have.has(id)).map((recipeId, i) => ({ recipeId, savedAt: oldest - 1 - i }));
  return [...existing, ...added];
}

/** Adds imported cooks whose ids aren't in the log yet, keeping the log in date order. */
export function mergeCooks(log: readonly CookEvent[], incoming: readonly CookEvent[]): CookEvent[] {
  const have = new Set(log.map((e) => e.id));
  const added = incoming.filter((e) => !have.has(e.id));
  return added.length ? [...log, ...added].sort((a, b) => a.cookedAt - b.cookedAt) : [...log];
}
