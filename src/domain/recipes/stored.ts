// A recipe of your own as it's stored and synced: the draft's words plus a
// little bookkeeping. Rows from other phones (household members, your other
// phones) are checked against this shape before they reach the screens: one
// malformed row used to crash every member's app on every launch (SEC-05).
// A row that fails is skipped, never "repaired" by guessing.
import type { RecipeDraft } from './draft';
import { CUISINES, DIFFICULTIES, MEAL_TYPES, type RecipeSource } from './types';

export type StoredRecipe = {
  id: string;
  draft: RecipeDraft;
  source: Exclude<RecipeSource, 'house'>;
  sourceUrl?: string | undefined;
  createdAt: number;
  updatedAt: number;
};

/** Generous caps: far past any real recipe, well short of anything that would stall the phone. */
const CAPS = { id: 120, title: 200, summary: 2_000, ingredientsText: 20_000, methodText: 30_000, notesText: 10_000, sourceUrl: 2_000 };
const MAX_MINUTES = 7 * 24 * 60;
const MAX_SERVINGS = 50;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const count = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

export function isRecipeDraft(v: unknown): v is RecipeDraft {
  if (!isObj(v)) return false;
  return (
    text(v.title, CAPS.title) &&
    text(v.summary, CAPS.summary) &&
    (v.cuisine === undefined || v.cuisine === null || oneOf(CUISINES, v.cuisine)) &&
    Array.isArray(v.mealTypes) &&
    v.mealTypes.length <= MEAL_TYPES.length &&
    v.mealTypes.every((m) => oneOf(MEAL_TYPES, m)) &&
    oneOf(DIFFICULTIES, v.difficulty) &&
    count(v.prepMinutes, MAX_MINUTES) &&
    count(v.cookMinutes, MAX_MINUTES) &&
    count(v.servings, MAX_SERVINGS) &&
    typeof v.onePot === 'boolean' &&
    text(v.ingredientsText, CAPS.ingredientsText) &&
    text(v.methodText, CAPS.methodText) &&
    text(v.notesText, CAPS.notesText)
  );
}

/** A stored recipe that's safe to show, or undefined. A null cuisine (JSON has no undefined) reads as none. */
export function asStoredRecipe(v: unknown): StoredRecipe | undefined {
  if (!isObj(v) || !text(v.id, CAPS.id) || !v.id || !isRecipeDraft(v.draft)) return undefined;
  if (v.source !== 'user' && v.source !== 'imported') return undefined;
  if (v.sourceUrl !== undefined && v.sourceUrl !== null && !text(v.sourceUrl, CAPS.sourceUrl)) return undefined;
  const createdAt = typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : 0;
  const updatedAt = typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : createdAt;
  const { cuisine, ...draft } = v.draft;
  return {
    id: v.id,
    draft: { ...draft, ...(cuisine ? { cuisine } : {}) },
    source: v.source,
    ...(typeof v.sourceUrl === 'string' ? { sourceUrl: v.sourceUrl } : {}),
    createdAt,
    updatedAt,
  };
}

/** Only the recipes that pass, keyed by id. */
export function storedRecipes(values: Readonly<Record<string, unknown>>): Record<string, StoredRecipe> {
  const out: Record<string, StoredRecipe> = {};
  for (const [key, value] of Object.entries(values)) {
    const r = asStoredRecipe(value);
    if (r && r.id === key) out[key] = r;
  }
  return out;
}
