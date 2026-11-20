// Scaling a recipe to more or fewer servings, and printing an ingredient
// line for the cook in their chosen units.

import { formatKitchenNumber, formatMeasuredNumber, isRange, mapQuantity, NUMBER_PATTERN, parseNumber, type Quantity } from './quantity';
import { inflectItem } from './nouns';
import type { IngredientLine } from './types';
import { convert, UNITS, unitFromText, unitLabel, type UnitId } from './units';

export type UnitSystem = 'metric' | 'imperial';

/** Multiply a line's quantity. Lines without a quantity ("salt, to taste") are unchanged. */
export function scaleLine(line: IngredientLine, ratio: number): IngredientLine {
  if (line.quantity === undefined || ratio === 1) return line;
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error(`Invalid scale ratio: ${ratio}`);
  const quantity = mapQuantity(line.quantity, (n) => n * ratio);
  const extras = scaleExtras(line, ratio);
  if (line.unit !== undefined) return { ...line, ...extras, quantity };
  // Counted things agree with their number when it crosses one: "3 large onions" → "1 large onion" (K-2).
  const top = (q: Quantity) => (isRange(q) ? q.max : q);
  const wasOne = top(line.quantity) <= 1;
  const isOne = roundCount(top(quantity)) <= 1;
  const item = extras.item ?? line.item;
  return { ...line, ...extras, quantity, ...(wasOne !== isOne ? { item: inflectItem(item, isOne ? 1 : 2) } : {}) };
}

const MEASURE_SPELLINGS = (Object.keys(UNITS) as UnitId[])
  .filter((id) => UNITS[id].kind === 'mass' || UNITS[id].kind === 'volume')
  .flatMap((id) => UNITS[id].spellings)
  .sort((a, b) => b.length - a.length)
  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
/** "3 tbsp", "100ml", "1.5kg": an amount with a weight or volume after it. Sizes (cm) and times never match. */
const MEASURED_AMOUNT = new RegExp(String.raw`(${NUMBER_PATTERN})(\s?)(${MEASURE_SPELLINGS})(?![A-Za-z])`, 'gi');
/** "+ 1 whole egg": a bare count after a plus sign in the item. */
const PLUS_COUNT = new RegExp(String.raw`(\+\s*)(${NUMBER_PATTERN})(?![\d.,/]|\s?(?:${MEASURE_SPELLINGS})(?![A-Za-z]))`, 'gi');

function scaleMeasures(text: string, ratio: number): string {
  return text.replace(MEASURED_AMOUNT, (whole, amount: string, space: string, unitText: string) => {
    const n = parseNumber(amount);
    const unit = unitFromText(unitText);
    return n === undefined || unit === undefined ? whole : `${formatAmount(n * ratio, unit)}${space}${unitText}`;
  });
}

/**
 * A second amount written inside the line ("egg yolks + 1 whole egg", "zest
 * and 3 tbsp juice", "2 cups stock (500 ml)") scales with the first, so the
 * line never reads half-scaled (F-1). A note that sizes one item ("400g" on a
 * tin, "180g each") stays as it is; a note on a measured line, a "total" or
 * an "or …" alternative is an amount for the whole line and scales.
 */
function scaleExtras(line: IngredientLine, ratio: number): Partial<Pick<IngredientLine, 'item' | 'prep' | 'note'>> {
  const out: Partial<Pick<IngredientLine, 'item' | 'prep' | 'note'>> = {};
  const plus = line.item.indexOf('+');
  if (plus >= 0) {
    const tail = scaleMeasures(line.item.slice(plus), ratio).replace(PLUS_COUNT, (_, sign: string, amount: string) => {
      const n = parseNumber(amount);
      return n === undefined ? `${sign}${amount}` : `${sign}${formatKitchenNumber(roundCount(n * ratio))}`;
    });
    out.item = line.item.slice(0, plus) + tail;
  }
  if (line.prep) out.prep = scaleMeasures(line.prep, ratio);
  const counted = line.unit === undefined || UNITS[line.unit].kind === 'count';
  const perItem = /\b(each|per)\b/i.test(line.note ?? '') || (counted && !/^or\b|\btotal\b/i.test(line.note ?? ''));
  if (line.note && !perItem) out.note = scaleMeasures(line.note, ratio);
  return out;
}

/** Pinches, cloves and eggs come in halves at best: round counts up to the nearest half. */
function roundCount(n: number): number {
  // A typed "0 eggs" stays 0; only a real amount is lifted to a half (F-2).
  return n <= 0 ? n : Math.max(0.5, Math.ceil(n * 2 - 1e-9) / 2);
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
    // "375 g", not "0.4 kg", once a kilo or litre is scaled below one (F-2).
    if (unit === 'kg' && amount < 1) return { amount: convert(amount, 'kg', 'g'), unit: 'g' };
    if (unit === 'l' && amount < 1) return { amount: convert(amount, 'l', 'ml'), unit: 'ml' };
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
