// Recipes other cooks have published, as the app reads them from the server
// (public.published_recipes and public.cooks). The tables were made outside
// this repo's migrations, so every row is checked here before a screen sees
// it: a row that doesn't fit is dropped, never half-shown.
import type { IngredientLine } from '../ingredients/types';
import { UNITS, type UnitId } from '../ingredients/units';
import type { Quantity } from '../ingredients/quantity';
import { DIET_TAGS, DIFFICULTIES, MEAL_TYPES, SEASONS, type IngredientGroupBlock, type Recipe } from '../recipes/types';

export type CookKind = 'person' | 'official';

/** What a card or byline needs about a cook. */
export type CookSummary = { id: string; handle: string; displayName: string; avatarPath: string | undefined };

/** A cook's profile. Counts are kept by the database, never worked out here. */
export type Cook = CookSummary & {
  kind: CookKind;
  bio: string | undefined;
  homeRegion: string | undefined;
  recipeCount: number;
  followerCount: number;
  followingCount: number;
};

/** One post in the feed. */
export type FeedItem = {
  id: string;
  title: string;
  caption: string;
  cuisine: string;
  totalMinutes: number | undefined;
  publishedAt: string;
  photoPath: string | undefined;
  photoCredit: string | undefined;
  cook: CookSummary;
};

/**
 * A published recipe on the recipe page model. The cuisine stays the cook's own
 * word: the server has cuisines the catalogue doesn't (Caribbean, for one), and
 * the page only uses it for the empty-photo tint. Source and provenance describe
 * catalogue recipes, so they don't apply.
 */
export type PublishedRecipe = Omit<Recipe, 'cuisine' | 'source' | 'provenance' | 'image'> & { cuisine: string };

/** Where the next page starts: newest first, with the id breaking ties. */
export type FeedCursor = { publishedAt: string; id: string };

export const PAGE_SIZE = 12;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const minutes = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 24 * 60 * 3 ? v : undefined;
function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

export function parseCookSummary(raw: unknown): CookSummary | undefined {
  if (!isObj(raw)) return undefined;
  const id = text(raw.id);
  const handle = text(raw.handle);
  if (!id || !handle) return undefined;
  return { id, handle, displayName: text(raw.display_name) ?? handle, avatarPath: text(raw.avatar_path) };
}

export function parseCook(raw: unknown): Cook | undefined {
  const summary = parseCookSummary(raw);
  if (!summary || !isObj(raw)) return undefined;
  return {
    ...summary,
    kind: raw.kind === 'official' ? 'official' : 'person',
    bio: text(raw.bio),
    homeRegion: text(raw.home_region),
    recipeCount: count(raw.recipe_count),
    followerCount: count(raw.follower_count),
    followingCount: count(raw.following_count),
  };
}

/** A feed row with its cook embedded (`cook:cooks(...)`). No cook, no post. */
export function parseFeedItem(raw: unknown): FeedItem | undefined {
  if (!isObj(raw)) return undefined;
  const id = text(raw.id);
  const title = text(raw.title);
  const publishedAt = text(raw.published_at);
  const cook = parseCookSummary(raw.cook);
  if (!id || !title || !publishedAt || !cook) return undefined;
  return {
    id,
    title,
    caption: text(raw.caption) ?? '',
    cuisine: text(raw.cuisine) ?? '',
    totalMinutes: minutes(raw.total_minutes),
    publishedAt,
    photoPath: text(raw.photo_path),
    photoCredit: creditLine(raw.photo_credit, raw.photo_source),
    cook,
  };
}

export function parseFeedPage(rows: unknown): FeedItem[] {
  return Array.isArray(rows) ? rows.map(parseFeedItem).filter((i): i is FeedItem => i !== undefined) : [];
}

function parseQuantity(v: unknown): Quantity | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (isObj(v) && typeof v.min === 'number' && typeof v.max === 'number' && v.min > 0 && v.max > v.min) return { min: v.min, max: v.max };
  return undefined;
}

function parseLine(raw: unknown): IngredientLine | undefined {
  if (!isObj(raw)) return undefined;
  const rawText = text(raw.raw);
  const item = text(raw.item) ?? rawText;
  if (!item || !rawText) return undefined;
  const line: IngredientLine = { item, raw: rawText };
  const quantity = parseQuantity(raw.quantity);
  if (quantity !== undefined) line.quantity = quantity;
  // An unknown unit can't be scaled or converted, so the line falls back to its words.
  if (typeof raw.unit === 'string' && raw.unit in UNITS) line.unit = raw.unit as UnitId;
  else if (raw.unit !== undefined) delete line.quantity;
  const ingredientId = text(raw.ingredientId);
  if (ingredientId) line.ingredientId = ingredientId;
  const prep = text(raw.prep);
  if (prep) line.prep = prep;
  const note = text(raw.note);
  if (note) line.note = note;
  if (raw.optional === true) line.optional = true;
  return line;
}

function parseGroup(raw: unknown): IngredientGroupBlock | undefined {
  if (!isObj(raw) || !Array.isArray(raw.items)) return undefined;
  const items = raw.items.map(parseLine).filter((l): l is IngredientLine => l !== undefined);
  if (!items.length) return undefined;
  const title = text(raw.title);
  return title ? { title, items } : { items };
}

/** The `recipe` jsonb column onto the recipe page model. Anything unreadable gives undefined. */
export function parseRecipe(raw: unknown, id: string): PublishedRecipe | undefined {
  if (!isObj(raw)) return undefined;
  const title = text(raw.title);
  const prepMinutes = minutes(raw.prepMinutes);
  const cookMinutes = minutes(raw.cookMinutes);
  const servings = typeof raw.servings === 'number' && Number.isInteger(raw.servings) && raw.servings >= 1 ? raw.servings : undefined;
  const groups = Array.isArray(raw.ingredientGroups) ? raw.ingredientGroups.map(parseGroup).filter((g) => g !== undefined) : [];
  const steps = Array.isArray(raw.steps) ? raw.steps.map((s) => (isObj(s) ? text(s.text) : undefined)).filter((s) => s !== undefined) : [];
  if (!title || prepMinutes === undefined || cookMinutes === undefined || !servings || !groups.length || !steps.length) return undefined;
  const list = <T extends string>(known: readonly T[], v: unknown): T[] =>
    Array.isArray(v) ? v.filter((x): x is T => oneOf(known, x)) : [];
  const summary = text(raw.summary);
  const notes = Array.isArray(raw.notes) ? raw.notes.map(text).filter((n) => n !== undefined) : [];
  const seasons = list(SEASONS, raw.seasons);
  return {
    id,
    title,
    ...(summary ? { summary } : {}),
    cuisine: text(raw.cuisine) ?? '',
    diets: list(DIET_TAGS, raw.diets),
    mealTypes: list(MEAL_TYPES, raw.mealTypes),
    difficulty: oneOf(DIFFICULTIES, raw.difficulty) ? raw.difficulty : 'medium',
    prepMinutes,
    cookMinutes,
    servings,
    onePot: raw.onePot === true,
    ...(seasons.length ? { seasons } : {}),
    ingredientGroups: groups,
    steps: steps.map((s) => ({ text: s })),
    ...(notes.length ? { notes } : {}),
  };
}

/**
 * The line under a photo. AI-generated photos always say so (D-029), even if
 * the credit someone typed forgets to.
 */
export function creditLine(credit: unknown, source: unknown): string | undefined {
  const words = text(credit);
  if (source === 'ai') return words && /ai-generated/i.test(words) ? words : words ? `AI-generated photo · ${words}` : 'AI-generated photo';
  return words;
}

/**
 * The cursor for the page after this one, or undefined when this was the last.
 * Read from the raw rows, so a bad row dropped by the parser doesn't end the feed early.
 */
export function cursorAfter(rows: readonly unknown[], pageSize: number = PAGE_SIZE): FeedCursor | undefined {
  const last = rows[rows.length - 1];
  if (rows.length < pageSize || !isObj(last)) return undefined;
  const publishedAt = text(last.published_at);
  const id = text(last.id);
  return publishedAt && id ? { publishedAt, id } : undefined;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The PostgREST `or` filter for "older than the cursor". Values are checked
 * first, so nothing from a row can change the shape of the query.
 */
export function olderThan(cursor: FeedCursor): string | undefined {
  if (!TIMESTAMP.test(cursor.publishedAt) || !UUID.test(cursor.id)) return undefined;
  const at = `"${cursor.publishedAt}"`;
  return `published_at.lt.${at},and(published_at.eq.${at},id.lt.${cursor.id})`;
}

/** Adds a page, keeping order and dropping anything already shown. */
export function appendPage(shown: readonly FeedItem[], page: readonly FeedItem[]): FeedItem[] {
  const seen = new Set(shown.map((i) => i.id));
  return [...shown, ...page.filter((i) => !seen.has(i.id))];
}

export const isUuid = (id: string): boolean => UUID.test(id);

const STORAGE_PATH = /^[A-Za-z0-9_-][A-Za-z0-9._/-]*$/;
export type Bucket = 'recipe-photos' | 'avatars';

/**
 * A photo's public address. Only paths inside our own storage become URLs
 * (rule 5: media points at our storage); a full URL or a path that climbs out
 * gives nothing, and the card shows its empty-photo tint instead.
 */
export function storageUrl(projectUrl: string, bucket: Bucket, path: string | undefined): string | undefined {
  if (!path || !STORAGE_PATH.test(path) || path.split('/').includes('..')) return undefined;
  return `${projectUrl}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** "1 recipe", "12 followers". */
export function countLabel(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-AU')} ${n === 1 ? one : many}`;
}
