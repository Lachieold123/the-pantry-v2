// A tick on the shopping list remembers how much it covered, in base units
// (grams, millilitres, counts), never as the text on screen. So it holds when
// a planned day passes and the amount goes down, when the units switch, and
// between household phones set to different units. Only needing more of
// something unticks it (BUG-01, D-044).

import { upper, type Quantity } from '../ingredients/quantity';
import { UNITS, type UnitId } from '../ingredients/units';
import { familyOf } from './amounts';

/** New ticks start with this mark. Older ticks hold the amount text instead, and still work while that text matches. */
const MARK = '=';
/** Rounding slack, so 1.1 lb shown and converted back doesn't count as "more". */
const SLACK = 1e-6;

type Amounts = readonly { quantity: Quantity; unit: UnitId | undefined }[];

function measures(amounts: Amounts): Map<string, number> {
  const out = new Map<string, number>();
  for (const { quantity, unit } of amounts) {
    const size = unit && UNITS[unit].kind !== 'count' ? (UNITS[unit].base ?? 1) : 1;
    const family = familyOf(unit);
    out.set(family, (out.get(family) ?? 0) + upper(quantity) * size);
  }
  return out;
}

/** What a tick stores: "=mass:500;count:none:3", or "=" when the line has no amount. */
export function tickValue(amounts: Amounts): string {
  const parts = [...measures(amounts)].sort(([a], [b]) => a.localeCompare(b)).map(([f, n]) => `${f}:${+n.toFixed(4)}`);
  return MARK + parts.join(';');
}

function parseTick(value: string): Map<string, number> | undefined {
  if (!value.startsWith(MARK)) return undefined;
  const out = new Map<string, number>();
  for (const part of value.slice(MARK.length).split(';')) {
    if (!part) continue;
    const at = part.lastIndexOf(':');
    const n = Number(part.slice(at + 1));
    if (at <= 0 || !Number.isFinite(n)) return undefined;
    out.set(part.slice(0, at), n);
  }
  return out;
}

/** Whether a stored tick still covers what the list needs now. */
export function tickHolds(stored: string | undefined, amounts: Amounts, amountText: string): boolean {
  if (stored === undefined) return false;
  const ticked = parseTick(stored);
  if (!ticked) return stored === amountText; // A tick from before D-044: it holds while the text is the same.
  for (const [family, need] of measures(amounts)) {
    const had = ticked.get(family);
    if (had === undefined || need > had * (1 + SLACK) + SLACK) return false;
  }
  return true;
}
