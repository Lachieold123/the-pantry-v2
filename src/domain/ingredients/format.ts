// Scaling a recipe to more or fewer servings, and printing an ingredient
// line for the cook in their chosen units.

import { formatKitchenNumber, formatMeasuredNumber, isRange, mapQuantity, parseNumber, type Quantity } from './quantity';
import { inflectItem } from './nouns';
import type { IngredientLine } from './types';
import { convert, UNITS, unitLabel, type UnitId } from './units';

export type UnitSystem = 'metric' | 'imperial';

/** Multiply a line's quantity. Lines without a quantity ("salt, to taste") are unchanged. */
export function scaleLine(line: IngredientLine, ratio: number): IngredientLine {
  if (line.quantity === undefined || ratio === 1) return line;
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error(`Invalid scale ratio: ${ratio}`);
  const counted = line.unit === undefined || UNITS[line.unit].kind === 'count';
  // Scaled eggs and onions come in halves at best; the recipe's own "¼ cabbage" is left alone (ratio 1 returns above).
  const quantity = mapQuantity(line.quantity, (n) => (counted ? roundCount(n * ratio) : n * ratio));
  if (line.unit !== undefined) return { ...line, quantity };
  // Counted things agree with their number when it crosses one: "3 large onions" → "1 large onion" (K-2).
  const top = (q: Quantity) => (isRange(q) ? q.max : q);
  const wasOne = top(line.quantity) <= 1;
  const isOne = top(quantity) <= 1;
  return { ...line, quantity, ...(wasOne !== isOne ? { item: inflectItem(line.item, isOne ? 1 : 2) } : {}) };
}

/** Pinches, cloves and eggs come in halves at best: round counts up to the nearest half. */
function roundCount(n: number): number {
  return Math.max(0.5, Math.ceil(n * 2 - 1e-9) / 2);
}

/** An amount someone wrote on purpose ("¼ cabbage", "⅓ bunch") prints as written; anything else rounds up to a half. */
function printableCount(n: number): number {
  const exact = (step: number) => Math.abs(n / step - Math.round(n / step)) < 1e-6;
  return n > 0 && (exact(1 / 4) || exact(1 / 3)) ? n : roundCount(n);
}

/**
 * Pick the unit to show. Metric keeps grams and millilitres, switching to kg
 * or L at 1000 and back below it ("⅛ kg" reads as 125 g). Imperial turns
 * weights into oz/lb, liquids over 60 ml into fl oz and from 32 fl oz into
 * quarts; spoons and cups are left alone because they work in both. In
 * either system a spoon or cup too small to print steps down a size.
 */
const BIG_METRIC = 997.5;

function displayUnit(amount: number, unit: UnitId, system: UnitSystem): { amount: number; unit: UnitId } {
  if (unit === 'cup' && amount < 1 / 4) return displayUnit(convert(amount, 'cup', 'tbsp'), 'tbsp', system);
  if (unit === 'tbsp' && amount < 1 / 2) return { amount: convert(amount, 'tbsp', 'tsp'), unit: 'tsp' };
  if (system === 'metric') {
    if (unit === 'oz' || unit === 'lb' || unit === 'kg') return displayUnit(convert(amount, unit, 'g'), 'g', system);
    if (unit === 'fl-oz' || unit === 'qt' || unit === 'l') return displayUnit(convert(amount, unit, 'ml'), 'ml', system);
    // From 997.5 the amount prints rounded to "1000", so it reads as 1 kg / 1 L instead.
    if (unit === 'g' && amount >= BIG_METRIC) return { amount: convert(amount, 'g', 'kg'), unit: 'kg' };
    if (unit === 'ml' && amount >= BIG_METRIC) return { amount: convert(amount, 'ml', 'l'), unit: 'l' };
    return { amount, unit };
  }
  if (unit === 'g' || unit === 'kg') {
    const grams = convert(amount, unit, 'g');
    // Under ¼ oz the nearest printable ounce would be "0 oz": a few grams is the honest amount.
    if (grams < convert(0.2, 'oz', 'g')) return { amount: grams, unit: 'g' };
    return grams >= 453 ? { amount: convert(grams, 'g', 'lb'), unit: 'lb' } : { amount: convert(grams, 'g', 'oz'), unit: 'oz' };
  }
  if (unit === 'ml' || unit === 'l' || unit === 'fl-oz' || unit === 'qt') {
    const ml = convert(amount, unit, 'ml');
    if (ml >= convert(32, 'fl-oz', 'ml') - 1e-6) return { amount: convert(ml, 'ml', 'qt'), unit: 'qt' };
    if (unit === 'fl-oz' || ml > 60) return { amount: convert(ml, 'ml', 'fl-oz'), unit: 'fl-oz' };
  }
  return { amount, unit };
}

function formatAmount(amount: number, unit: UnitId | undefined): string {
  if (unit === undefined || UNITS[unit].kind === 'count') return formatKitchenNumber(printableCount(amount));
  // D-013: imperial measures in quarters; whole fl oz above 10, where a quarter is a rounding error.
  if (unit === 'fl-oz' && amount > 10) return String(Math.round(amount));
  if (unit === 'oz' || unit === 'lb' || unit === 'fl-oz' || unit === 'qt') return formatKitchenNumber(amount, 'quarters');
  if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') return formatKitchenNumber(amount, 'spoons');
  if (unit === 'kg' || unit === 'l') {
    // "1½ kg" reads well; "2⅛ L" doesn't. Halves and quarters stay fractions, anything finer is a decimal.
    const quarters = Math.round(amount * 4) / 4;
    return Math.abs(quarters - amount) < 0.01 ? formatKitchenNumber(quarters) : String(Math.round(amount * 10) / 10);
  }
  return formatMeasuredNumber(amount);
}

/** The quantity and unit as printed: "⅓ cup", "1.2 kg", "2–3 cloves", "400 g", or "a pinch" for a speck of spice. */
export function formatQuantity(quantity: Quantity, unit: UnitId | undefined, system: UnitSystem): string {
  const lo = isRange(quantity) ? quantity.min : quantity;
  const hi = isRange(quantity) ? quantity.max : quantity;
  const shown = unit === undefined ? { amount: hi, unit: undefined } : displayUnit(hi, unit, system);
  const ratio = hi === 0 ? 1 : shown.amount / hi;
  const hiText = formatAmount(shown.amount, shown.unit);
  // Less than half an eighth of a teaspoon won't print as a fraction: it's a pinch, never "0 tsp".
  if (shown.unit === 'tsp' && hiText === '0') return 'a pinch';
  const loText = formatAmount(lo * ratio, shown.unit);
  const number = isRange(quantity) && loText !== hiText && loText !== '0' ? `${loText}–${hiText}` : hiText;
  if (shown.unit === undefined) return number;
  // Plural agrees with the number printed, not the one behind it: 1.02 cups prints "1 cup" (F20).
  return `${number} ${unitLabel(shown.unit, parseNumber(hiText) ?? hi * ratio)}`;
}

/** One ingredient line as the cook reads it: "2 cloves garlic, minced". */
export function formatLine(line: IngredientLine, system: UnitSystem): string {
  let text: string;
  if (line.quantity !== undefined && line.unit === 'leaf') {
    // "2 bay leaves", not "2 leaves bay": this unit reads after the item.
    const [amount = '', ...unitWords] = formatQuantity(line.quantity, line.unit, system).split(' ');
    text = `${amount} ${line.item} ${unitWords.join(' ')}`;
  } else {
    const amount = line.quantity !== undefined ? formatQuantity(line.quantity, line.unit, system) : undefined;
    text = amount === undefined ? line.item : `${amount}${amount === 'a pinch' ? ' of' : ''} ${line.item}`;
  }
  if (line.prep) text += `, ${line.prep}`;
  if (line.note) text += ` (${line.note})`;
  if (line.optional) text += ' (optional)';
  return text;
}
