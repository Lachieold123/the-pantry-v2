// Turns a free-text ingredient line ("2 garlic cloves, minced (or 1 tsp
// garlic paste)") into a structured IngredientLine. Used once, at build time,
// to convert the old catalogue, and at runtime for web imports and old
// custom recipes. Anything it isn't sure about is reported as an issue so a
// person can check it: guessing silently is how the old app went wrong.

import { NUMBER_PATTERN, parseNumber, type Quantity } from './quantity';
import type { IngredientLine, IngredientMatcher, ParsedLine, ParseIssue } from './types';
import { areConvertible, unitFromText, UNITS, type UnitId } from './units';

const LEADING_QUANTITY = new RegExp(String.raw`^(${NUMBER_PATTERN})(?:\s*(?:-|–|—|to)\s*(${NUMBER_PATTERN}))?\s*(?:x\s+)?`, 'i');

const MEASURE_PHRASE =
  /^(?:an?\s+)?(?:(small|large|big|generous|good)\s+)?(pinch|dash|splash|knob|handful|bunch|sprig|drizzle|squeeze|sprinkle)(?:es|s)?(?:\s+of)?\s+(.+)$/i;
/** A drizzle or a squeeze isn't an amount to scale or shop for: "1 olive oil" helps nobody. */
const UNMEASURED = new Set(['drizzle', 'squeeze', 'sprinkle']);
// "Juice of half a lemon": the article after "half" belongs to it, not to the lemon.
const JUICE_OR_ZEST = new RegExp(
  String.raw`^(juice|zest|juice and zest|zest and juice)\s+of\s+(${NUMBER_PATTERN}|half(?:\s+an?)?|an?|one|two)\s+(.+)$`,
  'i',
);
const HALF_A = /^half\s+an?\s+/i;
/** "(optional)", "(optional, traditional)", "(optional but lovely)", ", optional", "Optional:", "Optional fillings:". */
const OPTIONAL_PAREN = /\(\s*optional\b[\s,;:-]*(?:but\s+)?([^)]*)\)/i;
const OPTIONAL_ELSEWHERE = /,\s*optional\b|^optional(?:\s+[a-z]+)?\s*:\s*|\boptional:\s*/i;
/** "300 g/10 oz" or "(10 oz)" after a metric amount: the same amount again, which wouldn't scale. */
const SECOND_AMOUNT = new RegExp(String.raw`^\s*\/\s*(${NUMBER_PATTERN})\s*`, 'i');
const NOTE_AMOUNT = new RegExp(String.raw`^(${NUMBER_PATTERN})\s*(.+)$`, 'i');
const WORD_NUMBERS: Readonly<Record<string, number>> = { half: 0.5, a: 1, an: 1, one: 1, two: 2 };

/** Units that may trail the item when no unit follows the number: "3 garlic cloves" → 3 clove, garlic. */
const TRAILING_COUNT_UNITS: readonly UnitId[] = ['clove', 'sprig', 'stalk', 'fillet', 'rasher', 'leaf', 'stick', 'sheet', 'bunch', 'head'];

const SERVING_WORDS = /\b(to serve|for serving|on the side|to garnish|for garnish)\b/i;

export function parseIngredientLine(raw: string, match?: IngredientMatcher): ParsedLine {
  const issues: ParseIssue[] = [];
  let text = raw.trim().replace(/\s+/g, ' ');
  const notes: string[] = [];

  let optional = false;
  const optionalParen = OPTIONAL_PAREN.exec(text);
  if (optionalParen) {
    optional = true;
    // Keep what the writer said after "optional": "(optional, traditional)" → note "traditional".
    text = text.replace(OPTIONAL_PAREN, optionalParen[1]?.trim() ? `(${optionalParen[1].trim()})` : '').trim();
  }
  if (OPTIONAL_ELSEWHERE.test(text)) {
    optional = true;
    text = text.replace(new RegExp(OPTIONAL_ELSEWHERE.source, 'gi'), '').trim();
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
    const word = (juice[2] ?? '').toLowerCase().split(' ')[0] ?? '';
    quantity = WORD_NUMBERS[word] ?? parseNumber(word);
    prepFromPhrase = (juice[1] ?? '').toLowerCase().replace('juice', 'juiced').replace('zest', 'zested');
    text = juice[3] ?? '';
  } else if (measure) {
    const word = (measure[2] ?? '').toLowerCase();
    if (UNMEASURED.has(word)) {
      prepFromPhrase = `to ${word}`;
    } else {
      quantity = 1;
      unit = unitFromText(word);
      // The unit already says "handful": the note only needs the size ("small"), not "small handful" again.
      if (measure[1]) notes.push(unit ? measure[1].toLowerCase() : `${measure[1].toLowerCase()} ${word}`);
    }
    text = measure[3] ?? '';
  } else if (HALF_A.test(text)) {
    quantity = 0.5;
    text = text.replace(HALF_A, '');
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
        const second = SECOND_AMOUNT.exec(text);
        const secondUnit = second ? readUnit(text.slice(second[0].length)) : undefined;
        if (second && secondUnit && areConvertible(unit, secondUnit.unit)) {
          text = text.slice(second[0].length + secondUnit.length).trim();
          issues.push('second-amount');
        }
      }
    }
  }
  // "300 g (10 oz) flour": the app converts units itself, and a copied amount wouldn't scale.
  if (unit !== undefined && UNITS[unit].kind !== 'count') {
    for (let i = notes.length - 1; i >= 0; i--) {
      const m = NOTE_AMOUNT.exec(notes[i] ?? '');
      const noteUnit = m ? readUnit(m[2] ?? '') : undefined;
      if (m && noteUnit && noteUnit.length === (m[2] ?? '').length && areConvertible(unit, noteUnit.unit)) {
        notes.splice(i, 1);
        issues.push('second-amount');
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

/** Reads a unit at the start of the text, allowing "g" glued to the number, a two-word "fl oz", or a "/" after it ("300 g/10 oz"). */
function readUnit(text: string): { unit: UnitId; length: number } | undefined {
  const twoWord = /^(fl\.?\s*oz|fluid ounces?)\b\.?/i.exec(text);
  if (twoWord) return { unit: 'fl-oz', length: twoWord[0].length };
  const word = /^([a-zA-Z]+)\.?(?=\s|$|,|\/)/.exec(text);
  if (!word) return undefined;
  const unit = unitFromText(word[1] ?? '');
  return unit ? { unit, length: word[0].length } : undefined;
}
