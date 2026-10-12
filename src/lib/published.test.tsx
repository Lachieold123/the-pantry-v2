// The read layer asks the server for published rows only, newest first, a
// page at a time, and only ever reads (never writes) these tables.
import { COOK_ROW, feedRow, RECIPE_JSON } from '@/domain/testing/published';
import { fetchCook, fetchFeedPage, fetchPublishedRecipe, photoUrl } from './published';

type Call = [string, ...unknown[]];
const calls: Call[] = [];
let answer: { data: unknown; error: { message: string } | null } = { data: [], error: null };

// A stand-in for supabase-js's query builder: records each call, and resolves to `answer`.
// It has only read methods, and the client has no rpc, so any write would fail these tests.
function builder(): unknown {
  const b: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'or', 'order', 'limit', 'abortSignal']) {
    b[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return b;
    };
  }
  b.maybeSingle = () => Promise.resolve(answer);
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(answer).then(resolve);
  return b;
}
const mockFrom = jest.fn((table: string) => {
  calls.push(['from', table]);
  return builder();
});
jest.mock('./supabase', () => ({ supabase: () => ({ from: mockFrom }) }));

beforeEach(() => {
  calls.length = 0;
  answer = { data: [], error: null };
});

const names = () => calls.map((c) => c[0]);

describe('fetchFeedPage', () => {
  it('reads published rows only, newest first, with the cook embedded', async () => {
    answer = { data: [feedRow(1), feedRow(2)], error: null };
    const r = await fetchFeedPage();
    expect(r.ok && r.value.items.map((i) => i.title)).toEqual(['Dish 1', 'Dish 2']);
    expect(r.ok && r.value.next).toBeUndefined();
    expect(calls).toContainEqual(['from', 'published_recipes']);
    expect(calls).toContainEqual(['eq', 'status', 'published']);
    expect(calls).toContainEqual(['order', 'published_at', { ascending: false }]);
    expect(calls).toContainEqual(['limit', 12]);
    expect(String(calls.find((c) => c[0] === 'select')?.[1])).toContain('cook:cooks!inner(');
    expect(names()).not.toContain('or');
  });

  it('gives a cursor after a full page, and uses it for the next', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => feedRow(i + 1));
    answer = { data: rows, error: null };
    const first = await fetchFeedPage();
    const next = first.ok ? first.value.next : undefined;
    expect(next).toEqual({ publishedAt: rows[11]?.published_at, id: rows[11]?.id });
    calls.length = 0;
    await fetchFeedPage(next, COOK_ROW.id);
    expect(calls).toContainEqual(['eq', 'cook_id', COOK_ROW.id]);
    expect(String(calls.find((c) => c[0] === 'or')?.[1])).toContain(`id.lt.${rows[11]?.id}`);
  });

  it('turns errors into a problem, never a throw', async () => {
    answer = { data: null, error: { message: 'TypeError: Network request failed' } };
    expect(await fetchFeedPage()).toEqual({ ok: false, problem: 'offline' });
    answer = { data: null, error: { message: 'permission denied for table published_recipes' } };
    expect(await fetchFeedPage()).toEqual({ ok: false, problem: 'failed' });
  });
});

describe('fetchPublishedRecipe and fetchCook', () => {
  it('maps a published recipe onto the page model', async () => {
    const row = { ...feedRow(1), recipe: RECIPE_JSON };
    answer = { data: row, error: null };
    const r = await fetchPublishedRecipe(row.id);
    expect(r.ok && r.value.recipe.title).toBe('Escabeche');
    expect(r.ok && r.value.item.cook.handle).toBe('kinilaw.kai');
    expect(calls).toContainEqual(['eq', 'status', 'published']);
  });

  it('says not found for a missing row or a bad id, without asking the server for a bad id', async () => {
    answer = { data: null, error: null };
    expect(await fetchPublishedRecipe('00000001-0000-4000-8000-000000000000')).toEqual({ ok: false, problem: 'not-found' });
    calls.length = 0;
    expect(await fetchCook('not-a-uuid')).toEqual({ ok: false, problem: 'not-found' });
    expect(calls).toHaveLength(0);
  });

  it('reads a cook', async () => {
    answer = { data: COOK_ROW, error: null };
    const r = await fetchCook(COOK_ROW.id);
    expect(r.ok && r.value.displayName).toBe('Kai Santos');
    expect(calls).toContainEqual(['from', 'cooks']);
  });
});

it('builds photo URLs in our own project', () => {
  expect(photoUrl('recipe-photos', 'house/x.jpg')).toBe(
    'https://eozyhllkvajvrecojdxu.supabase.co/storage/v1/object/public/recipe-photos/house/x.jpg',
  );
});
