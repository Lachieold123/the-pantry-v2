// The K-36 pull against a pretend Supabase: it asks the server for rows after
// a mark, pages by a whole position so shared milliseconds never skip or repeat
// a row, answers the newest stamp, and falls back to the old full read when
// the server doesn't have the function yet.
import { pullRowsSince } from './household';
import { isMissingFunction, pullSince } from './pullRows';

type ServerRow = { kind: string; key: string; received_at: number };
let mockServer: ServerRow[] = [];
let mockMissing = false;
const mockCalls: Record<string, unknown>[] = [];

const order = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);
const position = (r: { received_at: number; kind: string; key: string }) => [r.received_at, r.kind, r.key] as const;
const compare = (a: readonly (string | number)[], b: readonly (string | number)[]) =>
  a.reduce<number>((c, v, i) => c || order(v, b[i] ?? ''), 0);

/** What `<table>_since` does: rows after (received_at, kind, key), in that order, at most p_limit. */
function mockSince(args: Record<string, unknown>) {
  const after = [args.p_after as number, args.p_kind as string, args.p_key as string] as const;
  return [...mockServer]
    .sort((a, b) => compare(position(a), position(b)))
    .filter((r) => compare(position(r), after) > 0)
    .slice(0, args.p_limit as number)
    .map((r) => ({ ...r, data: {}, deleted: false, updated_at: 1, updated_by: 'x' }));
}

jest.mock('./supabase', () => ({
  supabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      mockCalls.push({ fn, ...args });
      if (mockMissing) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
      return { data: mockSince(args), error: null };
    },
    from: () => {
      const old = { kind: 'plan', key: 'old', data: {}, deleted: false, updated_at: 5, updated_by: 'x' };
      const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: [old], error: null }) };
      return q;
    },
  }),
}));

beforeEach(() => {
  mockCalls.length = 0;
  mockMissing = false;
});

it('pages past 1,000 rows by a whole position, so rows sharing a millisecond are each read once', async () => {
  mockServer = Array.from({ length: 2345 }, (_, i) => ({
    kind: i % 2 ? 'tick' : 'plan',
    key: `k${i}`,
    received_at: 1000 + Math.floor(i / 700),
  }));
  const pulled = await pullSince('account_rows', { column: 'user_id', id: 'u1' }, undefined);
  expect(pulled.ok).toBe(true);
  if (!pulled.ok) return;
  expect(pulled.value.rows).toHaveLength(2345);
  expect(new Set(pulled.value.rows.map((r) => r.key)).size).toBe(2345);
  expect(pulled.value.newest).toBe(1003);
  expect(mockCalls[0]).toEqual({ fn: 'account_rows_since', p_user: 'u1', p_after: 0, p_kind: '', p_key: '', p_limit: 1000 });
  expect(mockCalls).toHaveLength(3);
});

it('asks the household function only for rows after the mark', async () => {
  mockServer = [
    { kind: 'plan', key: 'a', received_at: 10 },
    { kind: 'plan', key: 'b', received_at: 20 },
  ];
  const pulled = await pullRowsSince('h1', 15);
  expect(pulled.ok && pulled.value.rows.map((r) => r.key)).toEqual(['b']);
  expect(pulled.ok && pulled.value.newest).toBe(20);
  expect(mockCalls[0]).toMatchObject({ fn: 'household_rows_since', p_household: 'h1', p_after: 15 });
});

it('answers no newest stamp when nothing changed', async () => {
  mockServer = [{ kind: 'plan', key: 'a', received_at: 10 }];
  const pulled = await pullRowsSince('h1', 50);
  expect(pulled.ok && pulled.value).toEqual({ rows: [], newest: undefined });
});

it('falls back to reading every row, with no mark, when the server has no such function yet', async () => {
  mockMissing = true;
  const pulled = await pullRowsSince('h1', 15);
  expect(pulled.ok && pulled.value).toEqual({
    rows: [{ kind: 'plan', key: 'old', data: {}, deleted: false, updatedAt: 5, updatedBy: 'x' }],
    newest: undefined,
  });
});

it('knows a missing function from other errors', () => {
  expect(isMissingFunction({ code: 'PGRST202' })).toBe(true);
  expect(isMissingFunction({ code: '42883' })).toBe(true);
  expect(isMissingFunction({ code: '42501' })).toBe(false);
  expect(isMissingFunction(undefined)).toBe(false);
});
