// Turns a free-text ingredient line ("2 garlic cloves, minced (or 1 tsp
// garlic paste)") into a structured IngredientLine. Used once, at build time,
// to convert the old catalogue, and at runtime for web imports and old
// custom recipes. Anything it isn't sure about is reported as an issue so a
// person can check it: guessing silently is how the old app went wrong.

import { NUMBER_PATTERN, parseNumber, type Quantity } from './quantity';
import type { IngredientLine, IngredientMatcher, ParsedLine, ParseIssue } from './types';
import { unitFromText, UNITS, type UnitId } from './units';

const LEADING_QUANTITY = new RegExp(String.raw`^(${NUMBER_PATTERN})(?:\s*(?:-|–|—|to)\s*(${NUMBER_PATTERN}))?\s*(?:x\s+)?`, 'i');

const MEASURE_PHRASE =
  /^(?:an?\s+)?(?:(small|large|big|generous|good)\s+)?(pinch|dash|splash|knob|handful|bunch|sprig|drizzle|squeeze|sprinkle)(?:es|s)?(?:\s+of)?\s+(.+)$/i;
const JUICE_OR_ZEST = new RegExp(
  String.raw`^(juice|zest|juice and zest|zest and juice)\s+of\s+(${NUMBER_PATTERN}|half|an?|one|two)\s+(.+)$`,
  'i',
);
const WORD_NUMBERS: Readonly<Record<string, number>> = { half: 0.5, a: 1, an: 1, one: 1, two: 2 };

/** Units that may trail the item when no unit follows the number: "3 garlic cloves" → 3 clove, garlic. */
const TRAILING_COUNT_UNITS: readonly UnitId[] = ['clove', 'sprig', 'stalk', 'fillet', 'rasher', 'leaf', 'stick', 'sheet', 'bunch', 'head'];

const SERVING_WORDS = /\b(to serve|for serving|on the side|to garnish|for garnish)\b/i;

export function parseIngredientLine(raw: string, match?: IngredientMatcher): ParsedLine {
  const issues: ParseIssue[] = [];
  let text = raw.trim().replace(/\s+/g, ' ');
  const notes: string[] = [];

  let optional = false;
  if (/\(optional\)|,\s*optional\b|\boptional:\s*/i.test(text)) {
    optional = true;
    text = text.replace(/\(optional\)|,\s*optional\b|\boptional:\s*/gi, '').trim();
  }
  text = text.replace(/\(([^)]*)\)/g, (_m, inner: string) => {
    if (inner.trim()) notes.push(inner.trim());
    return '';
  });
  text = text.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();

  let quantity: Quantity | undefined;
  let unit: UnitId | undefined;
  let prepFromPhrase: string | undefined;

  const juice = JUICE_OR_ZEST.exec(text);
  const measure = MEASURE_PHRASE.exec(text);
  if (juice) {
    const word = (juice[2] ?? '').toLowerCase();
    quantity = WORD_NUMBERS[word] ?? parseNumber(word);
    prepFromPhrase = (juice[1] ?? '').toLowerCase().replace('juice', 'juiced').replace('zest', 'zested');
    text = juice[3] ?? '';
  } else if (measure) {
    quantity = 1;
    unit = unitFromText(measure[2] ?? '');
    if (measure[1]) notes.push(`${measure[1].toLowerCase()} ${(measure[2] ?? '').toLowerCase()}`);
    text = measure[3] ?? '';
  } else {
    const q = LEADING_QUANTITY.exec(text);
    if (q) {
      const a = parseNumber(q[1] ?? '');
      const b = q[2] ? parseNumber(q[2]) : undefined;
      if (a !== undefined) quantity = b !== undefined && b > a ? { min: a, max: b } : a;
      text = text.slice(q[0].length);
      const u = readUnit(text);
      // "4 cloves" on its own is the spice, not a unit of garlic: keep the word as the item.
      if (u && text.slice(u.length).trim().replace(/^[,(]/, '').trim() !== '') {
        unit = u.unit;
        text = text.slice(u.length).trim();
      }
    }
  }

  // "400g tin crushed tomatoes": the tin is packaging, not the thing to buy.
  if (unit && UNITS[unit].kind !== 'count') {
    text = text.replace(/^(?:tins?|cans?|jars?|packets?|bags?)\s+(?:of\s+)?/i, (m) => {
      notes.push(
        m
          .trim()
          .replace(/\s+of$/i, '')
          .toLowerCase(),
      );
      return '';
    });
  }
  text = text.replace(/^of\s+/i, '');

  const [itemPart = '', ...prepParts] = text.split(/,\s*|\s+[–—]\s+/);
  let item = itemPart.trim();
  const prepText = [prepFromPhrase, prepParts.join(', ').trim()].filter(Boolean).join(', ');

  if (quantity !== undefined && unit === undefined) {
    const words = item.split(' ');
    const last = words[words.length - 1] ?? '';
    const trailing = unitFromText(last);
    if (trailing && TRAILING_COUNT_UNITS.includes(trailing) && words.length > 1) {
      unit = trailing;
      item = words.slice(0, -1).join(' ');
    }
  }

  if (quantity === undefined) issues.push(SERVING_WORDS.test(raw) ? 'serving-suggestion' : 'no-quantity');
  if (/\band\b|\bor\b|&/i.test(item) && !/\bsalt and (black )?pepper\b/i.test(item)) issues.push('multiple-ingredients');

  // "1 cinnamon stick" reads as a stick unit of "cinnamon", but a stick is its own thing to buy, not ground cinnamon.
  const ingredientId = (unit === 'stick' ? match?.(`${item} stick`) : undefined) ?? match?.(item);
  if (!ingredientId) issues.push('no-ingredient-match');

  const line: IngredientLine = { item, raw };
  if (quantity !== undefined) line.quantity = quantity;
  if (unit !== undefined) line.unit = unit;
  if (ingredientId !== undefined) line.ingredientId = ingredientId;
  if (prepText) line.prep = prepText;
  if (notes.length) line.note = notes.join('; ');
  if (optional) line.optional = true;
  return { line, issues };
}

/** Reads a unit at the start of the text, allowing "g" glued to the number or a two-word "fl oz". */
function readUnit(text: string): { unit: UnitId; length: number } | undefined {
  const twoWord = /^(fl\.?\s*oz|fluid ounces?)\b\.?/i.exec(text);
  if (twoWord) return { unit: 'fl-oz', length: twoWord[0].length };
  const word = /^([a-zA-Z]+)\.?(?=\s|$|,)/.exec(text);
  if (!word) return undefined;
  const unit = unitFromText(word[1] ?? '');
  return unit ? { unit, length: word[0].length } : undefined;
}
