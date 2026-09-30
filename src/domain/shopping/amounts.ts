// Amounts on the shopping list: adding lines together, the unit-free need a
// tick records, and the name that agrees with the amount. Split from
// derive.ts to keep each file readable.

import type { IngredientDef } from '../ingredients/database';
import { inflectItem } from '../ingredients/nouns';
import { addQuantities, formatKitchenNumber, mapQuantity, parseNumber, upper, type Quantity } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { convert, UNITS, type UnitId } from '../ingredients/units';
import type { Need } from './edits';

const SPOON_OR_CUP: ReadonlySet<UnitId> = new Set(['tsp', 'tbsp', 'cup']);

/** Adds amounts that can be added (D-010): same unit family merges, others sit side by side. */
export function mergeAmounts(lines: readonly IngredientLine[]): { quantity: Quantity; unit: UnitId | undefined }[] {
  const families = new Map<string, { quantity: Quantity; unit: UnitId | undefined; units: UnitId[] }>();
  for (const line of lines) {
    if (line.quantity === undefined) continue;
    const unit = line.unit;
    const kind = unit === undefined ? 'count:none' : UNITS[unit].kind === 'count' ? `count:${unit}` : UNITS[unit].kind;
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
  return [...families.values()].map(({ quantity, unit }) => stepUpSpoons(quantity, unit));
}

/**
 * Merging can pile spoons up ("24 tbsp", F20). Move up to the next measure
 * when it reads as a clean kitchen amount ("1½ tbsp", "⅔ cup"), or once there's
 * so much that counting spoons is silly (two tablespoons, a cup).
 */
function stepUpSpoons(quantity: Quantity, unit: UnitId | undefined): { quantity: Quantity; unit: UnitId | undefined } {
  // [from, to, smallest clean amount worth the step, amount that always steps]
  const steps: [UnitId, UnitId, number, number][] = [
    ['tsp', 'tbsp', 1, 2],
    ['tbsp', 'cup', 1 / 2, 1],
  ];
  for (const [from, to, clean, always] of steps) {
    if (unit !== from) continue;
    const n = convert(upper(quantity), from, to);
    if (n >= always || (n >= clean && !formatKitchenNumber(n).includes('.'))) {
      quantity = mapQuantity(quantity, (x) => convert(x, from, to));
      unit = to;
    }
  }
  return { quantity, unit };
}

/** The unit family a tick is recorded in: amounts in one family add and compare. */
function family(unit: UnitId | undefined): string {
  if (unit === undefined) return 'count';
  return UNITS[unit].kind === 'count' ? `count:${unit}` : UNITS[unit].kind;
}

/** The need in base units (g, ml, cm, or a count), so it doesn't depend on the display units (F12). */
export function needOf(lines: readonly IngredientLine[]): Need {
  const need: Need = {};
  for (const line of lines) {
    if (line.quantity === undefined) continue;
    const base = line.unit === undefined || UNITS[line.unit].kind === 'count' ? 1 : (UNITS[line.unit].base ?? 1);
    const f = family(line.unit);
    need[f] = (need[f] ?? 0) + upper(line.quantity) * base;
  }
  return need;
}

/**
 * "Zest of 1 lemon" and "juice of 1 lemon" in one recipe are the same lemon
 * (F196): within a recipe, zest and juice lines of one fruit count the larger
 * of the two, not the sum.
 */
export function combineZestAndJuice(lines: readonly IngredientLine[]): IngredientLine[] {
  const citrus = new Map<string, { zest: number; juice: number; line: IngredientLine }>();
  const rest: IngredientLine[] = [];
  for (const line of lines) {
    const part = /^(zested|juiced)/.exec(line.prep ?? '')?.[1];
    if (!part || !line.ingredientId || line.unit !== undefined || line.quantity === undefined) {
      rest.push(line);
      continue;
    }
    const seen = citrus.get(line.ingredientId) ?? { zest: 0, juice: 0, line };
    if (part === 'zested') seen.zest += upper(line.quantity);
    else seen.juice += upper(line.quantity);
    citrus.set(line.ingredientId, seen);
  }
  return [...rest, ...[...citrus.values()].map(({ zest, juice, line }) => ({ ...line, quantity: Math.max(zest, juice) }))];
}

/**
 * The name agrees with the amount (F130): "eggs, 4", "egg, 1". Counted
 * things take the plural past one. By weight or volume, only a plural the
 * database gives is used ("cherry tomatoes, 250 g"), because the word rules
 * would make "pumpkins, 1 kg".
 */
export function displayName(
  def: IngredientDef | undefined,
  fallback: string,
  amounts: { unit: UnitId | undefined }[],
  printed: string[],
): string {
  if (!def) return fallback;
  let counted = false;
  let measured = false;
  amounts.forEach((a, i) => {
    const text = printed[i] ?? '';
    const top = text.split(' ')[0]?.split('–').pop() ?? '';
    if (a.unit !== undefined && UNITS[a.unit].kind !== 'count') measured = true;
    else if (text.includes(' ') || (parseNumber(top) ?? 2) > 1) counted = true; // "2 tins", "4"
  });
  if (counted) return def.plural ?? inflectItem(def.name, 2);
  return measured && def.plural ? def.plural : def.name;
}
