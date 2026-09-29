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

/** Plain text from a JSON-LD string: entities decoded, stray tags and whitespace removed. */
export function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

const str = (v: Json | undefined): string => (typeof v === 'string' ? cleanText(v) : typeof v === 'number' ? String(v) : '');

/** ISO 8601 durations as sites write them: "PT1H30M", "PT90M", "P0DT0H20M". */
export function minutesFromDuration(value: Json | undefined): number | undefined {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i.exec(str(value).replace(/\s/g, ''));
  if (!m || m[0] === 'P' || m[0] === 'PT') return undefined;
  const total = Number(m[1] ?? 0) * 24 * 60 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return Math.round(total);
}

function isRecipe(node: JsonObject): boolean {
  return asArray(node['@type']).some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe');
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
      if (isObject(node.mainEntity)) queue.push(node.mainEntity);
    }
  }
  return undefined;
}

function instructions(value: Json | undefined): string[] {
  const out: string[] = [];
  for (const item of asArray(value)) {
    // One long string: paragraphs, list items and line breaks each mark a new step.
    if (typeof item === 'string') out.push(...item.split(/<\/?(?:p|li|br)[^>]*>|\n/i).map(cleanText));
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

/** The recipe a page embeds, or undefined when there isn't one we can read. Photos aren't imported (v1 has no image storage). */
export function extractRecipe(html: string): RecipeDraft | undefined {
  const scripts = html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    let parsed: Json;
    try {
      parsed = JSON.parse(script[1] ?? '') as Json;
    } catch {
      continue;
    }
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
      prepMinutes: prep ?? (total !== undefined && cook !== undefined ? Math.max(0, total - cook) : 0),
      cookMinutes: cook ?? (prep === undefined ? (total ?? 0) : 0),
      servings: servingsFrom(node.recipeYield) ?? EMPTY_DRAFT.servings,
      ingredientsText: ingredients.join('\n'),
      methodText: steps.join('\n'),
    };
  }
  return undefined;
}

/** A usable web address from what was pasted ("bbcgoodfood.com/…" gets https://), or undefined. */
export function normaliseLink(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
