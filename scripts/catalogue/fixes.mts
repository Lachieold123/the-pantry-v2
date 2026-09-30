// The hand-made layer on top of the old catalogue: text fixes, number
// overrides and the vetted mark (D-014). Every entry is checked, because a
// mistyped fix that silently does nothing is how a safety correction (a
// cooking temperature, an allergy note) would fail to ship.

import { DIFFICULTIES, type Difficulty } from '../../src/domain/recipes/types.ts';

export type Replacement = { from: string; to: string };

/** One recipe's entry in scripts/data/recipe-fixes.json. */
export type Fix = {
  steps?: Replacement[];
  ingredients?: Replacement[];
  addNotes?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  difficulty?: Difficulty;
};

const FIX_FIELDS = new Set(['steps', 'ingredients', 'addNotes', 'prepMinutes', 'cookMinutes', 'servings', 'difficulty']);
// The same limit validateRecipe applies, checked here too so a string or a typo fails with a clear message.
const MAX_MINUTES = 3 * 24 * 60;

const isWhole = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Problems with the fix file itself: unknown recipes, unknown fields, impossible numbers. */
export function checkFixes(fixes: Record<string, Fix>, recipeIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  for (const [id, fix] of Object.entries(fixes)) {
    if (!recipeIds.has(id)) errors.push(`${id}: recipe-fixes.json has a fix for a recipe that doesn't exist`);
    for (const field of Object.keys(fix)) {
      if (!FIX_FIELDS.has(field)) errors.push(`${id}: recipe-fixes.json has an unknown field "${field}"`);
    }
    if (fix.prepMinutes !== undefined && !isWhole(fix.prepMinutes, 0, MAX_MINUTES))
      errors.push(`${id}: prepMinutes must be a whole number of minutes, 0 to ${MAX_MINUTES}`);
    if (fix.cookMinutes !== undefined && !isWhole(fix.cookMinutes, 0, MAX_MINUTES))
      errors.push(`${id}: cookMinutes must be a whole number of minutes, 0 to ${MAX_MINUTES}`);
    if (fix.servings !== undefined && !isWhole(fix.servings, 1, 50)) errors.push(`${id}: servings must be a whole number, 1 to 50`);
    if (fix.difficulty !== undefined && !(DIFFICULTIES as readonly string[]).includes(fix.difficulty))
      errors.push(`${id}: difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  }
  return errors;
}

/** Problems with the tag file's keys and its vetted marks. */
export function checkTags(tags: Record<string, { vetted?: unknown }>, recipeIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  for (const [id, tag] of Object.entries(tags)) {
    if (!recipeIds.has(id)) errors.push(`${id}: recipe-tags.json has tags for a recipe that doesn't exist`);
    if (tag.vetted !== undefined && tag.vetted !== true) errors.push(`${id}: "vetted" must be true or left out`);
  }
  return errors;
}

const occurrences = (text: string, part: string) => text.split(part).length - 1;

/**
 * Applies each replacement to the one place it matches across every group of
 * a recipe (ingredient groups, or the single list of steps). A replacement
 * that matches nowhere, or in more than one place, is an error and changes
 * nothing: it would otherwise apply twice or silently not at all.
 */
export function applyAcross(
  id: string,
  where: string,
  groups: readonly (readonly string[])[],
  replacements: readonly Replacement[] | undefined,
  errors: string[],
): { groups: string[][]; applied: number } {
  let out = groups.map((g) => [...g]);
  let applied = 0;
  for (const r of replacements ?? []) {
    const hits = out.reduce((n, g) => n + g.reduce((m, t) => m + occurrences(t, r.from), 0), 0);
    if (hits !== 1) {
      errors.push(`${id}: fix for ${where} matched ${hits} times (it must match exactly once): "${r.from}"`);
      continue;
    }
    out = out.map((g) => g.map((t) => (t.includes(r.from) ? t.replace(r.from, r.to) : t)));
    applied++;
  }
  return { groups: out, applied };
}
