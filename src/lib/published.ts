// Reading other cooks' published recipes (public.published_recipes, public.cooks).
// Read-only: the app never writes these tables. The reads work without signing
// in (the tables' row-level security lets anyone read published rows), so the
// feed never creates an anonymous account just to look. Every call answers with
// a result and gives up after a timeout, so a bad connection is a message on
// screen, never a crash or a spinner forever.
import {
  cursorAfter,
  isUuid,
  olderThan,
  PAGE_SIZE,
  parseCook,
  parseFeedPage,
  parseRecipe,
  storageUrl,
  type Bucket,
  type Cook,
  type FeedCursor,
  type FeedItem,
  type PublishedRecipe,
} from '@/domain/published/published';
import { SUPABASE_URL } from './backend';
import { supabase } from './supabase';

export type ReadProblem = 'offline' | 'not-found' | 'failed';
export type ReadResult<T> = { ok: true; value: T } | { ok: false; problem: ReadProblem };
export type FeedPage = { items: FeedItem[]; next: FeedCursor | undefined };

const TIMEOUT_MS = 15_000;
const FEED_COLUMNS =
  'id,title,caption,cuisine,total_minutes,published_at,photo_path,photo_credit,photo_source,cook:cooks!inner(id,handle,display_name,avatar_path)';
const COOK_COLUMNS = 'id,kind,handle,display_name,bio,home_region,avatar_path,recipe_count,follower_count,following_count';

const fail = (problem: ReadProblem) => ({ ok: false as const, problem });

/** @internal Exported for its tests. */
export function problemOf(message: string | undefined): ReadProblem {
  return /network|fetch|timed out|offline|abort/i.test(message ?? '') ? 'offline' : 'failed';
}

async function withTimeout<T>(run: (signal: AbortSignal) => PromiseLike<ReadResult<T>>): Promise<ReadResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch (e) {
    return fail(problemOf(String(e)));
  } finally {
    clearTimeout(timer);
  }
}

/** One page of the feed, newest first; `cookId` narrows it to one cook's recipes. */
export function fetchFeedPage(cursor?: FeedCursor, cookId?: string): Promise<ReadResult<FeedPage>> {
  return withTimeout(async (signal) => {
    let query = supabase().from('published_recipes').select(FEED_COLUMNS).eq('status', 'published');
    if (cookId) query = query.eq('cook_id', cookId);
    if (cursor) {
      const filter = olderThan(cursor);
      if (!filter) return fail('failed');
      query = query.or(filter);
    }
    const { data, error } = await query
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE)
      .abortSignal(signal);
    if (error) return fail(problemOf(error.message));
    const rows: unknown[] = Array.isArray(data) ? data : [];
    return { ok: true, value: { items: parseFeedPage(rows), next: cursorAfter(rows) } };
  });
}

/** A published recipe and its feed details, for the recipe page. */
export function fetchPublishedRecipe(id: string): Promise<ReadResult<{ item: FeedItem; recipe: PublishedRecipe }>> {
  if (!isUuid(id)) return Promise.resolve(fail('not-found'));
  return withTimeout(async (signal) => {
    const { data, error } = await supabase()
      .from('published_recipes')
      .select(`${FEED_COLUMNS},recipe`)
      .eq('status', 'published')
      .eq('id', id)
      .abortSignal(signal)
      .maybeSingle();
    if (error) return fail(problemOf(error.message));
    const item = parseFeedPage(data ? [data] : [])[0];
    const recipe = data ? parseRecipe((data as { recipe?: unknown }).recipe, id) : undefined;
    return item && recipe ? { ok: true, value: { item, recipe } } : fail('not-found');
  });
}

export function fetchCook(id: string): Promise<ReadResult<Cook>> {
  if (!isUuid(id)) return Promise.resolve(fail('not-found'));
  return withTimeout(async (signal) => {
    const { data, error } = await supabase().from('cooks').select(COOK_COLUMNS).eq('id', id).abortSignal(signal).maybeSingle();
    if (error) return fail(problemOf(error.message));
    const cook = parseCook(data);
    return cook ? { ok: true, value: cook } : fail('not-found');
  });
}

/** A storage path as a URL in our own project, or undefined. */
export const photoUrl = (bucket: Bucket, path: string | undefined) => storageUrl(SUPABASE_URL, bucket, path);

/** Words for a problem, for screens to show. Raw error text never reaches people. */
export function problemWords(problem: ReadProblem): string {
  if (problem === 'offline') return 'Couldn’t reach the server. Check your connection and try again.';
  if (problem === 'not-found') return 'This may have been taken down.';
  return 'Something went wrong loading this. Try again in a moment.';
}
