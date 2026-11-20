// Live rows (K-32) against a pretend Realtime: the phone joins its scope's
// private topic with its sign-in, takes broadcast rows, and only falls back to
// Postgres Changes when the server refuses the topic (migration not applied).
import { listenAccount } from './account';
import { listen } from './household';

type Status = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';
type FakeChannel = {
  name: string;
  opts: unknown;
  bindings: { type: string; filter: Record<string, unknown>; fn: (p: unknown) => void }[];
  report: (status: Status, error?: Error) => void;
  removed: boolean;
};

const mockChannels: FakeChannel[] = [];
const mockSetAuth = jest.fn(async () => undefined);

jest.mock('expo-apple-authentication', () => ({}));
jest.mock('./supabase', () => ({
  supabase: () => ({
    realtime: { setAuth: mockSetAuth },
    channel: (name: string, opts?: unknown) => {
      const ch: FakeChannel = { name, opts, bindings: [], report: () => undefined, removed: false };
      mockChannels.push(ch);
      const api = {
        on: (type: string, filter: Record<string, unknown>, fn: (p: unknown) => void) => {
          ch.bindings.push({ type, filter, fn });
          return api;
        },
        subscribe: (cb?: (s: Status, e?: Error) => void) => {
          ch.report = (s, e) => cb?.(s, e);
          return ch;
        },
      };
      return api;
    },
    removeChannel: async (ch: FakeChannel) => {
      ch.removed = true;
    },
  }),
}));

const settle = () => new Promise((r) => setTimeout(r, 0));
const dbRow = { kind: 'cupboard', key: 'milk', data: {}, deleted: false, updated_at: 7, updated_by: 'b', received_at: 9 };

beforeEach(() => {
  mockChannels.length = 0;
  mockSetAuth.mockClear();
});

it("joins the household's private topic with the sign-in, and takes broadcast rows", async () => {
  const got: unknown[] = [];
  const stop = listen('h1', (r) => got.push(r));
  await settle();
  expect(mockSetAuth).toHaveBeenCalled();
  const [ch] = mockChannels;
  expect(ch?.name).toBe('household:h1');
  expect(ch?.opts).toEqual({ config: { private: true } });
  expect(ch?.bindings[0]).toMatchObject({ type: 'broadcast', filter: { event: 'row' } });
  ch?.bindings[0]?.fn({ payload: dbRow });
  ch?.bindings[0]?.fn({ payload: 'not a row' });
  expect(got).toEqual([{ kind: 'cupboard', key: 'milk', data: {}, deleted: false, updatedAt: 7, updatedBy: 'b' }]);
  stop();
  expect(ch?.removed).toBe(true);
});

it("joins the account's own private topic", async () => {
  listenAccount('u1', () => undefined)();
  await settle();
  // Stopped before the sign-in was handed over: never joins.
  expect(mockChannels).toHaveLength(0);
  const stop = listenAccount('u1', () => undefined);
  await settle();
  expect(mockChannels[0]?.name).toBe('account:u1');
  stop();
});

it('falls back to Postgres Changes when the server refuses the private topic', async () => {
  const got: unknown[] = [];
  const stop = listen('h1', (r) => got.push(r));
  await settle();
  const [priv] = mockChannels;
  priv?.report('CHANNEL_ERROR', new Error('Unauthorized: You do not have permissions to read from this Channel topic: household:h1'));
  expect(priv?.removed).toBe(true);
  const legacy = mockChannels[1];
  expect(legacy?.bindings[0]).toMatchObject({
    type: 'postgres_changes',
    filter: { event: '*', schema: 'public', table: 'household_rows', filter: 'household_id=eq.h1' },
  });
  legacy?.bindings[0]?.fn({ new: dbRow });
  expect(got).toHaveLength(1);
  stop();
  expect(legacy?.removed).toBe(true);
});

it('stays on the private topic through a network error, or an error after joining', async () => {
  const stop = listen('h1', () => undefined);
  await settle();
  const [priv] = mockChannels;
  priv?.report('CHANNEL_ERROR', new Error('socket closed'));
  priv?.report('SUBSCRIBED');
  priv?.report('CHANNEL_ERROR', new Error('Unauthorized'));
  expect(mockChannels).toHaveLength(1);
  expect(priv?.removed).toBe(false);
  stop();
});
