// Amounts: parsing "1½", "1 1/2", "2–3" from text, and formatting numbers
// the way a cookbook would print them ("⅓ cup", never "0.3333 cup").

export type Range = { min: number; max: number };
export type Quantity = number | Range;

const UNICODE_FRACTIONS: Readonly<Record<string, number>> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅕': 1 / 5,
  '⅙': 1 / 6,
};

/**
 * Matches one number as written in recipes: 2, 2.5, 1/2, 1 1/2, 1-1/2, ½, 1½,
 * 1 ½ and 1,000. Thousands come first so "1,000 g" isn't read as the decimal 1.000.
 */
export const NUMBER_PATTERN = String.raw`(?:\d+[\s-]\d+\/\d+|\d+\/\d+|(?:\d+\s?)?[¼½¾⅓⅔⅛⅜⅝⅞⅕⅙]|\d{1,3}(?:,\d{3})+(?!\d)|\d+(?:[.,]\d+)?)`;

export function parseNumber(text: string): number | undefined {
  const s = text.trim();
  const unicode = /^(\d*)\s*([¼½¾⅓⅔⅛⅜⅝⅞⅕⅙])$/.exec(s);
  if (unicode) return Number(unicode[1] || 0) + (UNICODE_FRACTIONS[unicode[2] ?? ''] ?? 0);
  // "1-1/2" is how some US sites write one and a half, never a range down to a half.
  const mixed = /^(\d+)[\s-]+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[3]) === 0 ? undefined : Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  if (/^\d{1,3}(?:,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ''));
  const fraction = /^(\d+)\/(\d+)$/.exec(s);
  if (fraction) return Number(fraction[2]) === 0 ? undefined : Number(fraction[1]) / Number(fraction[2]);
  if (!/^\d+(?:[.,]\d+)?$/.test(s)) return undefined;
  return Number(s.replace(',', '.'));
}

export function isRange(q: Quantity): q is Range {
  return typeof q === 'object';
}

export function mapQuantity(q: Quantity, fn: (n: number) => number): Quantity {
  return isRange(q) ? { min: fn(q.min), max: fn(q.max) } : fn(q);
}

export function addQuantities(a: Quantity, b: Quantity): Quantity {
  if (!isRange(a) && !isRange(b)) return a + b;
  const ra = isRange(a) ? a : { min: a, max: a };
  const rb = isRange(b) ? b : { min: b, max: b };
  return { min: ra.min + rb.min, max: ra.max + rb.max };
}

/** Largest value of a quantity: what you'd buy for. */
export function upper(q: Quantity): number {
  return isRange(q) ? q.max : q;
}

const PRINT_FRACTIONS: readonly [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
];
/** Spoons and cups: eighths as well, so every amount lands within 1/16 of something printable. */
const SPOON_FRACTIONS: readonly [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];
/** Imperial weights read oddly in eighths and thirds ("1⅛ lb"), so they snap to quarters only. */
const QUARTER_FRACTIONS: readonly [number, string][] = [
  [1 / 4, '¼'],
  [1 / 2, '½'],
  [3 / 4, '¾'],
];

/**
 * Format a number for spoons, cups and counts. Snaps to the nearest kitchen
 * fraction (to within 1/24) so scaling 1 cup down to a third reads "⅓", not
 * "0.33". Falls back to one decimal place when nothing is close, except in
 * the 'spoons' and 'quarters' styles, which always snap: nobody measures
 * "0.4 tsp" or "3.3 lb". Can return "0"; callers that print amounts step
 * down a unit first (see format.ts).
 */
export function formatKitchenNumber(n: number, style: 'kitchen' | 'quarters' | 'spoons' = 'kitchen'): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const snapAlways = style !== 'kitchen';
  const fractions = style === 'quarters' ? QUARTER_FRACTIONS : style === 'spoons' ? SPOON_FRACTIONS : PRINT_FRACTIONS;
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  let best: [number, string] = [0, ''];
  for (const candidate of [[0, ''] as [number, string], ...fractions, [1, ''] as [number, string]]) {
    if (Math.abs(frac - candidate[0]) < Math.abs(frac - best[0])) best = candidate;
  }
  if (!snapAlways && Math.abs(frac - best[0]) > 1 / 24) return n.toFixed(1).replace(/\.0$/, '');
  if (best[0] === 0) return String(whole);
  if (best[0] === 1) return String(whole + 1);
  return whole === 0 ? best[1] : `${whole}${best[1]}`;
}

/**
 * Format a weight or liquid measure. Nobody weighs 437 g of mince, so larger
 * amounts round to a sensible step: under 10 to one decimal, under 100 to the
 * nearest whole, under 1000 to the nearest 5, above that to the nearest 10.
 */
export function formatMeasuredNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  // A real amount never prints as "0": a scaled-down pinch of saffron reads "0.03 g".
  if (n < 0.1) return String(Number(n.toPrecision(1)));
  if (n < 10) return String(Math.round(n * 10) / 10);
  if (n < 100) return String(Math.round(n));
  if (n < 1000) return String(Math.round(n / 5) * 5);
  return String(Math.round(n / 10) * 10);
}
