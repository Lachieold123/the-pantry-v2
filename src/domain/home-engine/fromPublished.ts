// Published recipes (public.published_recipes with the cook embedded) onto the
// engine's EngineItem, plus the pantry match the app uses, so the engine,
// the Cupboard and the recipe page all agree on "can I cook this?". Pure: the
// app (lib/homeFeed.ts) and the scripts both use it.
import { cookable, type Shelf } from '../cupboard/cookable';
import type { Kitchen } from '../cupboard/kitchen';
import type { IngredientIndex } from '../ingredients/database';
import { blocksMatch } from '../ingredients/hierarchy';
import { parseFeedItem, parseIngredientGroups, type FeedItem } from '../published/published';
import { allLines, type IngredientGroupBlock } from '../recipes/types';
import type { EngineItem, PantryMatch } from './types';

/** The columns the ranker reads: the feed card's, plus tags and the ingredient groups (not the whole recipe). */
export const RANK_COLUMNS =
  'id,title,caption,cuisine,meal_types,diets,difficulty,total_minutes,published_at,photo_path,photo_credit,photo_source,groups:recipe->ingredientGroups,cook:cooks!inner(id,handle,display_name,avatar_path,follower_count,recipe_count)';

export type RankRow = { feed: FeedItem; item: EngineItem; groups: IngredientGroupBlock[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/**
 * How much to trust a post before anyone has engaged with it: the cook's
 * followers (log scale, so one big account doesn't dominate), how much they've
 * published, and whether the post has a photo.
 */
export function authorQuality(followers: number, recipes: number, hasPhoto: boolean): number {
  const f = Math.min(1, Math.log1p(followers) / Math.log1p(60));
  const r = Math.min(1, recipes / 10);
  return Math.round((0.5 * f + 0.2 * r + 0.3 * (hasPhoto ? 1 : 0)) * 1000) / 1000;
}

/** One row onto the feed card and the engine item. A row that doesn't fit is dropped. */
export function parseRankRow(raw: unknown, index: IngredientIndex, kitchen: Kitchen): RankRow | undefined {
  const feed = parseFeedItem(raw);
  if (!feed || !isObj(raw)) return undefined;
  const groups = parseIngredientGroups(raw.groups);
  if (!groups.length) return undefined;
  const ids = new Set<string>();
  const needs = new Set<string>();
  for (const line of allLines({ ingredientGroups: groups })) {
    const id = kitchen.model ? kitchen.model.relink(line) : line.ingredientId;
    if (!id) continue;
    ids.add(id);
    if (index.byId.get(id)?.staple) continue;
    if (kitchen.model ? blocksMatch(line) : !line.optional && line.quantity !== undefined) needs.add(id);
  }
  const cook = isObj(raw.cook) ? raw.cook : {};
  const publishedAt = Date.parse(feed.publishedAt);
  return {
    feed,
    groups,
    item: {
      id: feed.id,
      cookId: feed.cook.id,
      cookName: feed.cook.displayName,
      title: feed.title,
      cuisine: feed.cuisine.toLowerCase(),
      mealTypes: strings(raw.meal_types),
      diets: strings(raw.diets),
      difficulty: typeof raw.difficulty === 'string' ? raw.difficulty : 'medium',
      totalMinutes: feed.totalMinutes,
      ingredientIds: [...ids],
      needIds: [...needs],
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      authorQuality: authorQuality(num(cook.follower_count), num(cook.recipe_count), feed.photoPath !== undefined),
    },
  };
}

/**
 * The app's pantry match for one recipe: the Cupboard's own rules (kinds,
 * varieties, swaps, the shelf), counted over the things you'd actually buy.
 * Shelf items (spices, sauces) are left out of both sides of "9/10".
 */
export function pantryMatchOf(
  groups: readonly IngredientGroupBlock[],
  have: ReadonlySet<string>,
  shelf: Shelf,
  index: IngredientIndex,
  kitchen: Kitchen,
): PantryMatch {
  const c = cookable({ ingredientGroups: [...groups] }, have, shelf, index, kitchen);
  const got = c.have.length + c.swaps.length;
  return { have: got, total: got + c.missing.length, missing: c.missing };
}
