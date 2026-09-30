// Reads a recipe from a web page. Most recipe sites embed a machine-readable
// copy of the recipe (schema.org "Recipe" in a JSON-LD script tag) for search
// engines; we read that, never the page's visible layout, which changes
// weekly and is full of ads. The result is a draft the cook checks and saves.

import { EMPTY_DRAFT, type RecipeDraft } from './draft';
import { CUISINE_LABELS } from './labels';
import { CUISINES, type CuisineId, type MealType } from './types';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (v: Json | undefined): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);
const asArray = (v: Json | undefined): Json[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '’',
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
};

/**
 * A numeric entity as text. Pages can say "&#99999999;", which String.fromCodePoint
 * throws on, so anything outside Unicode is dropped; control characters become a space.
 */
function fromCodePoint(n: number): string {
  if (!Number.isInteger(n) || n > 0x10ffff) return '';
  return n < 0x20 ? ' ' : String.fromCodePoint(n);
}

/** Plain text from a JSON-LD string: entities decoded, stray tags and whitespace removed. */
export function cleanText(text: string): string {
  // [^<>] rather than [^>]: a run of "<" with no ">" would otherwise rescan the rest of the text from every "<".
  return (
    text
      .replace(/<[^<>]*>/g, ' ')
      .replace(/&#(\d{1,8});/g, (_m, n: string) => fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]{1,8});/gi, (_m, n: string) => fromCodePoint(Number.parseInt(n, 16)))
      // hasOwn, so "&constructor;" isn't read off Object.prototype.
      .replace(/&([a-z0-9]+);/gi, (m, name: string) => {
        const key = name.toLowerCase();
        return Object.hasOwn(ENTITIES, key) ? (ENTITIES[key] ?? m) : m;
      })
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const str = (v: Json | undefined): string => (typeof v === 'string' ? cleanText(v) : typeof v === 'number' ? String(v) : '');

/** The longest time a recipe can say (the validator's limit): 3 days. A site's "PT720H" is clamped rather than blocking the save. */
export const MAX_MINUTES = 3 * 24 * 60;

const clampMinutes = (n: number): number => Math.min(MAX_MINUTES, Math.max(0, Math.round(n)));

const NUM = '(\\d+(?:\\.\\d+)?)';
const DURATION = new RegExp(`^P(?:${NUM}Y)?(?:${NUM}M)?(?:${NUM}W)?(?:${NUM}D)?(?:T(?:${NUM}H)?(?:${NUM}M)?(?:${NUM}S)?)?$`, 'i');

/** ISO 8601 durations as sites write them: "PT1H30M", "PT90M", "P0DT0H20M", "P0Y0M0DT0H35M0.000S". */
export function minutesFromDuration(value: Json | undefined): number | undefined {
  const m = DURATION.exec(str(value).replace(/\s/g, ''));
  if (!m || m[0].toUpperCase() === 'P' || m[0].toUpperCase() === 'PT') return undefined;
  const [years, months, weeks, days, hours, minutes, seconds] = m.slice(1).map((v) => Number(v ?? 0));
  const day = 24 * 60;
  const total =
    (years ?? 0) * 365 * day +
    (months ?? 0) * 30 * day +
    (weeks ?? 0) * 7 * day +
    (days ?? 0) * day +
    (hours ?? 0) * 60 +
    (minutes ?? 0) +
    (seconds ?? 0) / 60;
  return clampMinutes(total);
}

/** "Recipe", "schema:Recipe", "http://schema.org/Recipe". */
function isRecipe(node: JsonObject): boolean {
  return asArray(node['@type']).some((t) => typeof t === 'string' && /(?:^|[:/#])recipe$/i.test(t));
}

/** Finds the first Recipe node, wherever the site put it (top level, a list, or an "@graph"). */
export function findRecipeNode(root: Json): JsonObject | undefined {
  const queue: Json[] = [root];
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const node = queue.shift();
    if (Array.isArray(node)) queue.push(...node);
    else if (isObject(node)) {
      if (isRecipe(node)) return node;
      if (node['@graph'] !== undefined) queue.push(node['@graph']);
      if (isObject(node.mainEntity) || Array.isArray(node.mainEntity)) queue.push(node.mainEntity);
    }
  }
  return undefined;
}

/**
 * "1. Preheat the oven. 2. Mix. 3. Bake." as one string: split before each
 * number, but only when they count 1, 2, 3… so "bake for 2. Then" stays whole.
 */
function splitNumbered(text: string): string[] {
  const starts: number[] = [];
  for (const m of text.matchAll(/(?:^|\s)(\d{1,2})[.)]\s/g)) {
    if (Number(m[1]) === starts.length + 1) starts.push(m.index + m[0].length - m[0].trimStart().length);
  }
  if (starts.length < 2) return [text];
  const intro = text.slice(0, starts[0]).trim();
  return [...(intro ? [intro] : []), ...starts.map((s, i) => text.slice(s, starts[i + 1]).trim())];
}

function instructions(value: Json | undefined): string[] {
  const out: string[] = [];
  for (const item of asArray(value)) {
    // One long string: paragraphs, list items and line breaks each mark a new step.
    if (typeof item === 'string')
      out.push(
        ...item
          .split(/<\/?(?:p|li|br)[^<>]*>|\n/i)
          .map(cleanText)
          .flatMap(splitNumbered),
      );
    else if (isObject(item)) {
      if (item.itemListElement !== undefined) out.push(...instructions(item.itemListElement));
      else out.push(str(item.text) || str(item.name));
    }
  }
  return out.filter(Boolean);
}

function servingsFrom(value: Json | undefined): number | undefined {
  for (const v of asArray(value)) {
    const n = /\d+/.exec(str(v));
    if (n) {
      const servings = Number(n[0]);
      if (servings >= 1 && servings <= 50) return servings;
    }
  }
  return undefined;
}

function cuisineFrom(value: Json | undefined): CuisineId | undefined {
  const names = asArray(value)
    .flatMap((v) => str(v).split(/,\s*/))
    .map((s) => s.toLowerCase());
  return CUISINES.find((c) => names.includes(CUISINE_LABELS[c].toLowerCase()) || names.includes(c));
}

function mealTypesFrom(value: Json | undefined): MealType[] {
  const text = asArray(value)
    .map((v) => str(v).toLowerCase())
    .join(' ');
  const types: MealType[] = [];
  if (/breakfast|brunch/.test(text)) types.push('breakfast');
  if (/lunch/.test(text)) types.push('lunch');
  if (/dinner|main|supper/.test(text)) types.push('dinner');
  if (/snack|side|starter|appetiser|appetizer|dessert|baking/.test(text)) types.push('snack');
  return types.length ? types : ['dinner'];
}

/** Recipe pages are a few hundred KB; past this we stop reading, so a hostile page can't stall the phone. */
export const MAX_PAGE_CHARS = 3_000_000;

/**
 * The contents of every JSON-LD script tag. A plain indexOf walk rather than
 * one big regex: on a page of unclosed "<script" tags the regex rescans to the
 * end from each one, which took tens of seconds.
 */
function jsonLdScripts(html: string): string[] {
  // Literal searches, case-insensitive: each moves forward only, so the whole walk is linear.
  const opens = /<script/gi;
  const closes = /<\/script/gi;
  const out: string[] = [];
  for (;;) {
    const open = opens.exec(html);
    if (!open) break;
    const tagEnd = html.indexOf('>', open.index);
    if (tagEnd < 0) break;
    closes.lastIndex = tagEnd;
    const close = closes.exec(html);
    if (!close) break;
    if (/type=["']?application\/ld\+json/i.test(html.slice(open.index, tagEnd))) out.push(html.slice(tagEnd + 1, close.index));
    opens.lastIndex = close.index + close[0].length;
  }
  return out;
}

/** JSON as sites write it, which sometimes has raw newlines or tabs inside strings (invalid JSON). */
function parseJson(text: string): Json | undefined {
  try {
    return JSON.parse(text) as Json;
  } catch {
    try {
      // A space is valid both inside a string and between tokens.
      return JSON.parse(text.replace(/[\u0000-\u001f]/g, ' ')) as Json;
    } catch {
      return undefined;
    }
  }
}

/** The recipe a page embeds, or undefined when there isn't one we can read. Photos aren't imported (v1 has no image storage). */
export function extractRecipe(page: string): RecipeDraft | undefined {
  const html = page.length > MAX_PAGE_CHARS ? page.slice(0, MAX_PAGE_CHARS) : page;
  for (const script of jsonLdScripts(html)) {
    const parsed = parseJson(script);
    if (parsed === undefined) continue;
    const node = findRecipeNode(parsed);
    if (!node) continue;
    const ingredients = asArray(node.recipeIngredient ?? node.ingredients)
      .map(str)
      .filter(Boolean);
    const steps = instructions(node.recipeInstructions);
    const prep = minutesFromDuration(node.prepTime);
    const cook = minutesFromDuration(node.cookTime);
    const total = minutesFromDuration(node.totalTime);
    return {
      ...EMPTY_DRAFT,
      title: str(node.name).slice(0, 80),
      summary: str(node.description).slice(0, 120),
      cuisine: cuisineFrom(node.recipeCuisine),
      mealTypes: mealTypesFrom(node.recipeCategory),
      // Sites often give two of the three; the missing one is the difference.
      prepMinutes: prep ?? (total !== undefined && cook !== undefined ? Math.max(0, total - cook) : 0),
      cookMinutes: cook ?? (total !== undefined ? Math.max(0, total - (prep ?? 0)) : 0),
      servings: servingsFrom(node.recipeYield) ?? EMPTY_DRAFT.servings,
      ingredientsText: ingredients.join('\n'),
      methodText: steps.join('\n'),
    };
  }
  return undefined;
}

const TRACKING = /^(?:utm_.*|fbclid|gclid)$/i;

/**
 * A usable web address from what was pasted, or undefined. Always https: iOS
 * blocks plain http, which would show as "couldn't reach". A login in the link
 * and tracking tags are dropped, since the link is kept on the recipe.
 */
export function normaliseLink(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed.replace(/^http:/i, 'https:') : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
    return url.hostname.includes('.') ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
