// How many a recipe can be scaled for. The Servings stepper stops at 24; a
// link ("?servings=1e9") must not get past that (F-11).

export const MAX_SERVINGS = 24;

/** A serves count from a link: a whole number from 1 to 24, or undefined to use the recipe's own. */
export function clampServings(n: number | undefined): number | undefined {
  if (n === undefined || !Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(MAX_SERVINGS, Math.max(1, Math.round(n)));
}
