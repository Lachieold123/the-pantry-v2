// Scaling a recipe to more or fewer servings, and printing an ingredient
// line for the cook in their chosen units.

import { formatKitchenNumber, formatMeasuredNumber, isRange, mapQuantity, type Quantity } from './quantity';
import { inflectItem } from './nouns';
import type { IngredientLine } from './types';
import { convert, UNITS, unitLabel, type UnitId } from './units';

export type UnitSystem = 'metric' | 'imperial';

/** Multiply a line's quantity. Lines without a quantity ("salt, to taste") are unchanged. */
export function scaleLine(line: IngredientLine, ratio: number): IngredientLine {
  if (line.quantity === undefined || ratio === 1) return line;
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error(`Invalid scale ratio: ${ratio}`);
  const quantity = mapQuantity(line.quantity, (n) => n * ratio);
  if (line.unit !== undefined) return { ...line, quantity };
  // Counted things agree with their number when it crosses one: "3 large onions" → "1 large onion" (K-2).
  const top = (q: Quantity) => (isRange(q) ? q.max : q);
  const wasOne = top(line.quantity) <= 1;
  const isOne = roundCount(top(quantity)) <= 1;
  return { ...line, quantity, ...(wasOne !== isOne ? { item: inflectItem(line.item, isOne ? 1 : 2) } : {}) };
}

/** Pinches, cloves and eggs come in halves at best: round counts up to the nearest half. */
function roundCount(n: number): number {
  return Math.max(0.5, Math.ceil(n * 2 - 1e-9) / 2);
}

/**
 * Pick the unit to show. Metric keeps grams and millilitres (switching to kg
 * or L at 1000). Imperial turns weights into oz/lb and liquids over 60 ml
 * into fl oz; spoons and cups are left alone because they work in both.
 */
function displayUnit(amount: number, unit: UnitId, system: UnitSystem): { amount: number; unit: UnitId } {
  if (system === 'metric') {
    if (unit === 'oz' || unit === 'lb') return displayUnit(convert(amount, unit, 'g'), 'g', system);
    if (unit === 'fl-oz') return displayUnit(convert(amount, unit, 'ml'), 'ml', system);
    if (unit === 'g' && amount >= 1000) return { amount: convert(amount, 'g', 'kg'), unit: 'kg' };
    if (unit === 'ml' && amount >= 1000) return { amount: convert(amount, 'ml', 'l'), unit: 'l' };
    return { amount, unit };
  }
  if (unit === 'g' || unit === 'kg') {
    const grams = convert(amount, unit, 'g');
    return grams >= 453 ? { amount: convert(grams, 'g', 'lb'), unit: 'lb' } : { amount: convert(grams, 'g', 'oz'), unit: 'oz' };
  }
  if ((unit === 'ml' || unit === 'l') && convert(amount, unit, 'ml') > 60) {
    return { amount: convert(amount, unit, 'fl-oz'), unit: 'fl-oz' };
  }
  return { amount, unit };
}

function formatAmount(amount: number, unit: UnitId | undefined): string {
  if (unit === undefined || UNITS[unit].kind === 'count') return formatKitchenNumber(roundCount(amount));
  if (unit === 'oz' || unit === 'lb' || unit === 'fl-oz') return formatKitchenNumber(amount, 'quarters');
  if (unit === 'kg' || unit === 'l') {
    // "1½ kg" reads well; "2⅛ L" doesn't. Halves and quarters stay fractions, anything finer is a decimal.
    const quarters = Math.round(amount * 4) / 4;
    return Math.abs(quarters - amount) < 0.01 ? formatKitchenNumber(quarters) : String(Math.round(amount * 10) / 10);
  }
  if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') return formatKitchenNumber(amount);
  return formatMeasuredNumber(amount);
}

/** The quantity and unit as printed: "⅓ cup", "1.2 kg", "2–3 cloves", "400 g". */
export function formatQuantity(quantity: Quantity, unit: UnitId | undefined, system: UnitSystem): string {
  const lo = isRange(quantity) ? quantity.min : quantity;
  const hi = isRange(quantity) ? quantity.max : quantity;
  const shown = unit === undefined ? { amount: hi, unit: undefined } : displayUnit(hi, unit, system);
  const ratio = hi === 0 ? 1 : shown.amount / hi;
  const hiText = formatAmount(shown.amount, shown.unit);
  const loText = formatAmount(lo * ratio, shown.unit);
  const number = isRange(quantity) && loText !== hiText ? `${loText}–${hiText}` : hiText;
  if (shown.unit === undefined) return number;
  return `${number} ${unitLabel(shown.unit, hi * ratio)}`;
}

/** One ingredient line as the cook reads it: "2 cloves garlic, minced". */
export function formatLine(line: IngredientLine, system: UnitSystem): string {
  let text: string;
  if (line.quantity !== undefined && line.unit === 'leaf') {
    // "2 bay leaves", not "2 leaves bay": this unit reads after the item.
    const [amount = '', ...unitWords] = formatQuantity(line.quantity, line.unit, system).split(' ');
    text = `${amount} ${line.item} ${unitWords.join(' ')}`;
  } else {
    text = line.quantity !== undefined ? `${formatQuantity(line.quantity, line.unit, system)} ${line.item}` : line.item;
  }
  if (line.prep) text += `, ${line.prep}`;
  if (line.note) text += ` (${line.note})`;
  if (line.optional) text += ' (optional)';
  return text;
}
