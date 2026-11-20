// Amounts on the shopping list: adding lines together (D-010), turning juice
// and zest into whole fruit, and the key each line is filed under.

import { normaliseWords } from '../ingredients/database';
import { addQuantities, mapQuantity, upper, type Quantity } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { convert, UNITS, type UnitId } from '../ingredients/units';

const SPOON_OR_CUP: ReadonlySet<UnitId> = new Set(['tsp', 'tbsp', 'cup']);

/** Which amounts can be added together: mass with mass, volume with volume, "2 cloves" with "1 clove". */
export function familyOf(unit: UnitId | undefined): string {
  if (unit === undefined) return 'count:none';
  return UNITS[unit].kind === 'count' ? `count:${unit}` : UNITS[unit].kind;
}

/** Adds amounts that can be added (D-010): same unit family merges, others sit side by side. */
export function mergeAmounts(lines: readonly IngredientLine[]): { quantity: Quantity; unit: UnitId | undefined }[] {
  const families = new Map<string, { quantity: Quantity; unit: UnitId | undefined; units: UnitId[] }>();
  for (const line of lines) {
    if (line.quantity === undefined) continue;
    const unit = line.unit;
    const kind = familyOf(unit);
    const existing = families.get(kind);
    if (!existing) {
      families.set(kind, { quantity: line.quantity, unit, units: unit ? [unit] : [] });
      continue;
    }
    if (unit === undefined || existing.unit === undefined) {
      existing.quantity = addQuantities(existing.quantity, line.quantity);
      continue;
    }
    // Spoons and cups stay in the largest spoon/cup used; everything else goes to g or ml and is re-displayed later.
    const allSpoons = [...existing.units, unit].every((u) => SPOON_OR_CUP.has(u));
    const target: UnitId = allSpoons
      ? ([...existing.units, unit].sort((a, b) => (UNITS[b].base ?? 0) - (UNITS[a].base ?? 0))[0] as UnitId)
      : UNITS[unit].kind === 'mass'
        ? 'g'
        : UNITS[unit].kind === 'volume'
          ? 'ml'
          : unit;
    const from = existing.unit;
    const a = mapQuantity(existing.quantity, (n) => convert(n, from, target));
    const b = mapQuantity(line.quantity, (n) => convert(n, unit, target));
    existing.quantity = addQuantities(a, b);
    existing.unit = target;
    existing.units.push(unit);
  }
  return [...families.values()].map(({ quantity, unit }) => ({ quantity, unit }));
}

/**
 * Roughly how much juice (and zest) one fruit gives, in millilitres. Recipes
 * ask for "1 tbsp lime juice"; you buy limes, so the list says "Lime, 1"
 * rather than "Lime, 1 tbsp + 1".
 */
const JUICE_PER_FRUIT_ML: Readonly<Record<string, number>> = { lime: 30, lemon: 45, orange: 80 };
// About a tablespoon (20 ml, D-013) of zest from a lemon, two teaspoons from a lime, two tablespoons from an orange.
const ZEST_PER_FRUIT_ML: Readonly<Record<string, number>> = { lime: 10, lemon: 20, orange: 40 };
const ZEST = /\b(zest|zested|rind|peel)\b/i;

export function asWholeFruit(line: IngredientLine): IngredientLine {
  const id = line.ingredientId;
  const perFruit = id ? (ZEST.test(line.raw) ? ZEST_PER_FRUIT_ML[id] : JUICE_PER_FRUIT_ML[id]) : undefined;
  const base = line.unit ? UNITS[line.unit].base : undefined;
  if (!perFruit || line.quantity === undefined || !line.unit || UNITS[line.unit].kind !== 'volume' || base === undefined) return line;
  const fruits = Math.max(1, Math.ceil((upper(line.quantity) * base) / perFruit - 1e-9));
  const whole: IngredientLine = { ...line, quantity: fruits };
  delete whole.unit;
  return whole;
}

/**
 * One recipe's lines for the same fruit, as whole fruit. Zest and juice come
 * from the same fruit, so "zest of 1 lemon" and "juice of 1 lemon" need one
 * lemon, not two: the zest only adds fruit when it needs more than the rest.
 */
export function wholeFruitLines(lines: readonly IngredientLine[]): IngredientLine[] {
  const out: IngredientLine[] = [];
  const zestFor = new Map<string, IngredientLine>();
  for (const raw of lines) {
    const line = asWholeFruit(raw);
    const id = line.ingredientId;
    if (id && JUICE_PER_FRUIT_ML[id] && ZEST.test(line.raw) && line.unit === undefined && line.quantity !== undefined) {
      const prev = zestFor.get(id);
      zestFor.set(id, prev?.quantity !== undefined ? { ...prev, quantity: addQuantities(prev.quantity, line.quantity) } : line);
      continue;
    }
    out.push(line);
  }
  for (const [id, zest] of zestFor) {
    const rest = out.filter((l) => l.ingredientId === id && l.unit === undefined && l.quantity !== undefined);
    const restCount = rest.reduce((n, l) => n + (l.quantity === undefined ? 0 : upper(l.quantity)), 0);
    const zestCount = zest.quantity === undefined ? 0 : upper(zest.quantity);
    if (zestCount > restCount) out.push({ ...zest, quantity: zestCount - restCount });
  }
  return out;
}

/** The longest list key kept as written. The server caps a row key at 200 characters, and a row key is "<week>|<key>". */
export const MAX_TEXT_KEY = 120;

/** A short, stable hash (FNV-1a, base 36), so a long key stays unique once it's shortened. */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** The key a line is filed under: its ingredient id, or its words for text the database doesn't know. Always short enough to sync. */
export function listKey(line: Pick<IngredientLine, 'ingredientId' | 'item'>): string {
  if (line.ingredientId) return line.ingredientId;
  const text = `text:${normaliseWords(line.item).join(' ')}`;
  return text.length <= MAX_TEXT_KEY ? text : `${text.slice(0, MAX_TEXT_KEY - 9)}~${shortHash(text)}`;
}
