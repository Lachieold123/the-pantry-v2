// The Home engine's reads from Supabase, all SELECT and all readable without
// signing in (row-level security lets anyone read published rows, cooks and
// follows). Separate from lib/homeFeed.ts so tests can stand in for the server.
import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { parseRankRow, RANK_COLUMNS, type RankRow } from '@/domain/home-engine/fromPublished';
import { isUuid, parseCook, type Cook } from '@/domain/published/published';
import { problemOf, type ReadResult } from './published';
import { supabase } from './supabase';

const TIMEOUT_MS = 20_000;
const MAX_ROWS = 2000;

async function timed<T>(run: (signal: AbortSignal) => Promise<ReadResult<T>>): Promise<ReadResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch (e) {
    return { ok: false, problem: problemOf(String(e)) };
  } finally {
    clearTimeout(timer);
  }
}

/** Every published recipe with what the ranker needs. `_key` only tells useRead when to read again. */
export function fetchRankRows(_key: string): Promise<ReadResult<RankRow[]>> {
  return timed(async (signal) => {
    const { data, error } = await supabase()
      .from('published_recipes')
      .select(RANK_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(0, MAX_ROWS - 1)
      .abortSignal(signal);
    if (error) return { ok: false, problem: problemOf(error.message) };
    const rows = (Array.isArray(data) ? data : []).map((r) => parseRankRow(r, INGREDIENTS, KITCHEN)).filter((r) => r !== undefined);
    return { ok: true, value: rows };
  });
}

/** Who a cook follows (public.follows is readable by anyone). Empty key: nobody. */
export function fetchFollows(cookId: string): Promise<ReadResult<string[]>> {
  if (!isUuid(cookId)) return Promise.resolve({ ok: true, value: [] });
  return timed(async (signal) => {
    const { data, error } = await supabase().from('follows').select('followee_id').eq('follower_id', cookId).abortSignal(signal);
    if (error) return { ok: false, problem: problemOf(error.message) };
    const ids = (Array.isArray(data) ? data : [])
      .map((r: { followee_id?: unknown }) => r.followee_id)
      .filter((x): x is string => typeof x === 'string');
    return { ok: true, value: ids };
  });
}

/** Every cook, most followed first, for the testing "rank Home as" list. */
export function fetchCookList(_key: string): Promise<ReadResult<Cook[]>> {
  return timed(async (signal) => {
    const { data, error } = await supabase()
      .from('cooks')
      .select('id,kind,handle,display_name,bio,home_region,avatar_path,recipe_count,follower_count,following_count')
      .order('follower_count', { ascending: false })
      .limit(500)
      .abortSignal(signal);
    if (error) return { ok: false, problem: problemOf(error.message) };
    return { ok: true, value: (Array.isArray(data) ? data : []).map(parseCook).filter((c) => c !== undefined) };
  });
}
