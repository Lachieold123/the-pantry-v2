// How many a recipe can be scaled for. One limit for the recipe page, the plan,
// Cook Mode and the editor, so "−" never jumps from 50 to 24 (audit F21).

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 50;

export function clampServings(n: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
}

/**
 * Servings from a route param. Links can say anything (`?servings=Infinity`
 * used to crash Cook Mode, audit F52), so only a whole number counts, clamped
 * to the limits; anything else means "use the recipe's own".
 */
export function parseServings(raw: string | string[] | undefined): number | undefined {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (text === undefined || !/^\s*-?\d+\s*$/.test(text)) return undefined;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? clampServings(n) : undefined;
}
