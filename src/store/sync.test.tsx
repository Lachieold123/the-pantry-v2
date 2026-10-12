// The sync engine on its own, with a pretend scope held in memory (audit
// 8 October: no tests covered offline, refusals, start-up, an expired
// session or clock skew). Each case failed before its fix.
import { AppState } from 'react-native';

import { OVERLAP_MS } from '@/domain/sync/cursor';
import { rowId, type Row } from '@/domain/sync/rows';
import { createEngine, type ScopeState } from './sync';

type Push = (rows: Row[]) => Promise<{ ok: true; value: null } | { ok: false; rejected?: boolean }>;

let appStateListener: ((s: string) => void) | undefined;
jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
  appStateListener = fn as (s: string) => void;
  return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
});

type Pull = (after: number | undefined) => Promise<{ ok: true; value: { rows: Row[]; newest: number | undefined } } | { ok: false }>;

function makeScope(opts: { push?: Push; ready?: () => Promise<boolean>; pull?: Row[]; pullWith?: Pull; id?: () => string } = {}) {
  let state: ScopeState = { mirror: {}, pending: {}, status: 'idle', lastSyncedAt: undefined, setAside: {} };
  let cupboard: string[] = [];
  const listeners = new Set<() => void>();
  const sent: Row[][] = [];
  const pulls: (number | undefined)[] = [];
  const push: Push =
    opts.push ??
    (async (rows) => {
      sent.push(rows);
      return { ok: true, value: null };
    });
  const engine = createEngine({
    read: () => state,
    write: (patch) => {
      state = { ...state, ...patch };
    },
    active: () => true,
    local: () => ({
      entries: [],
      listEdits: {},
      recipes: {},
      cupboard: cupboard.map((id) => ({ ingredientId: id, addedAt: 1, source: 'manual' as const })),
    }),
    apply: (rows) => {
      cupboard = rows.filter((r) => r.kind === 'cupboard' && !r.deleted).map((r) => r.key);
    },
    watch: (onChange) => {
      listeners.add(onChange);
      return [() => listeners.delete(onChange)];
    },
    author: () => 'me',
    id: opts.id ?? (() => 'h1'),
    pull: async (after) => {
      pulls.push(after);
      return opts.pullWith ? opts.pullWith(after) : { ok: true, value: { rows: opts.pull ?? [], newest: undefined } };
    },
    push: async (rows) => {
      const r = await push(rows);
      if (r.ok) sent.push(rows);
      return r;
    },
    listen: () => () => undefined,
    ...(opts.ready ? { ready: opts.ready } : {}),
  });
  const change = (ids: string[]) => {
    cupboard = ids;
    for (const l of listeners) l();
  };
  return { engine, change, sent, pulls, state: () => state, cupboard: () => cupboard };
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

afterEach(() => jest.useRealTimers());

it('offline: keeps rows waiting, says offline, and tries again later', async () => {
  let online = false;
  const s = makeScope({ push: async () => (online ? { ok: true, value: null } : { ok: false }) });
  s.engine.start();
  await tick();
  s.change(['egg']);
  await s.engine.flush();
  expect(s.state().status).toBe('offline');
  expect(s.engine.waiting()).toBe(1);
  online = true;
  await s.engine.flush();
  expect(s.engine.waiting()).toBe(0);
  expect(s.state().status).toBe('idle');
  s.engine.stop();
});

it('a row the server refuses is set aside, and the rest still go (BUG-03)', async () => {
  const s = makeScope({
    push: async (rows) => (rows.some((r) => r.key === 'bad') ? { ok: false, rejected: true } : { ok: true, value: null }),
  });
  s.engine.start();
  await tick();
  s.change(['egg', 'bad', 'milk']);
  await s.engine.flush();
  expect(s.engine.waiting()).toBe(0);
  expect(Object.keys(s.state().setAside ?? {})).toEqual([rowId('cupboard', 'bad')]);
  expect(
    s.sent
      .flat()
      .map((r) => r.key)
      .sort(),
  ).toEqual(['egg', 'milk']);
  s.engine.stop();
});

it('a row too big for the server is never sent (BUG-03)', async () => {
  const s = makeScope();
  s.engine.start();
  await tick();
  s.engine.record([{ kind: 'cupboard', key: 'x'.repeat(201), data: {}, deleted: false, updatedAt: 1 }]);
  await s.engine.flush();
  expect(s.sent.flat()).toHaveLength(0);
  expect(s.engine.waiting()).toBe(0);
  expect(Object.keys(s.state().setAside ?? {})).toHaveLength(1);
  s.engine.stop();
});

it('records changes made while the sign-in is still loading (BUG-04)', async () => {
  let release: (ok: boolean) => void = () => undefined;
  const s = makeScope({ ready: () => new Promise<boolean>((r) => (release = r)) });
  s.engine.start();
  s.change(['egg']);
  expect(s.engine.waiting()).toBe(1);
  release(true);
  await tick();
  await s.engine.flush();
  expect(s.sent.flat().map((r) => r.key)).toContain('egg');
  s.engine.stop();
});

it('a sign-in that can’t load yet (offline, expired) holds the start, then retries on return to the app (BUG-05)', async () => {
  let ok = false;
  const s = makeScope({ ready: async () => ok });
  s.engine.start();
  await tick();
  expect(s.engine.running()).toBe(false);
  s.change(['egg']);
  expect(s.engine.waiting()).toBe(1); // Kept, not dropped.
  ok = true;
  appStateListener?.('active');
  await tick();
  expect(s.engine.running()).toBe(true);
  s.engine.stop();
});

it('a change made here beats the version it replaced, even if this clock is behind (BUG-17)', async () => {
  const future = Date.now() + 10 * 60_000;
  const s = makeScope({
    pull: [{ kind: 'cupboard', key: 'milk', data: { addedAt: 1, source: 'manual' }, deleted: false, updatedAt: future, updatedBy: 'b' }],
  });
  s.engine.start();
  await tick();
  expect(s.cupboard()).toEqual(['milk']);
  s.change([]);
  const row = s.state().mirror[rowId('cupboard', 'milk')];
  expect(row?.deleted).toBe(true);
  expect(row?.updatedAt).toBe(future + 1);
  s.engine.stop();
});

it('flush waits for a send already running, so sign-out never sees "unsaved" mid-send', async () => {
  let finish: () => void = () => undefined;
  const s = makeScope({ push: () => new Promise((r) => (finish = () => r({ ok: true, value: null }))) });
  s.engine.start();
  await tick();
  s.change(['egg']);
  const first = s.engine.flush();
  const second = s.engine.flush();
  finish();
  await second;
  await first;
  expect(s.engine.waiting()).toBe(0);
  s.engine.stop();
});

const milk = (updatedAt: number): Row => ({
  kind: 'cupboard',
  key: 'milk',
  data: { addedAt: 1, source: 'manual' },
  deleted: false,
  updatedAt,
  updatedBy: 'b',
});

it('K-36: pulls everything once, then only what the server received since, from a little before the mark', async () => {
  const s = makeScope({ pullWith: async () => ({ ok: true, value: { rows: [milk(1)], newest: 1_000_000 } }) });
  s.engine.start();
  await tick();
  expect(s.pulls).toEqual([undefined]);
  expect(s.state().cursor).toEqual({ scope: 'h1', at: 1_000_000 });
  appStateListener?.('active');
  await tick();
  expect(s.pulls).toEqual([undefined, 1_000_000 - OVERLAP_MS]);
  s.engine.stop();
});

it('K-36: a pull that finds nothing new, or fails, keeps the mark', async () => {
  const answers = [
    { ok: true as const, value: { rows: [milk(1)], newest: 2_000_000 } },
    { ok: true as const, value: { rows: [], newest: undefined } },
    { ok: false as const },
  ];
  const s = makeScope({ pullWith: async () => answers.shift() ?? { ok: false } });
  s.engine.start();
  await tick();
  const mark = { scope: 'h1', at: 2_000_000 };
  expect(s.state().cursor).toEqual(mark);
  await s.engine.pull();
  expect(s.state().cursor).toEqual(mark);
  await s.engine.pull();
  expect(s.state().cursor).toEqual(mark);
  expect(s.state().status).toBe('offline');
  s.engine.stop();
});

it("K-36: a mark from another household is ignored, so the new one's first pull is a full one", async () => {
  let id = 'h1';
  const s = makeScope({ id: () => id, pullWith: async () => ({ ok: true, value: { rows: [milk(2)], newest: 5_000_000 } }) });
  s.engine.start();
  await tick();
  id = 'h2';
  await s.engine.pull();
  expect(s.pulls).toEqual([undefined, undefined]);
  expect(s.state().cursor).toEqual({ scope: 'h2', at: 5_000_000 });
  s.engine.stop();
});

it('K-36: an older server (no stamps) is pulled in full every time, as before', async () => {
  const s = makeScope({ pull: [milk(3)] });
  s.engine.start();
  await tick();
  await s.engine.pull();
  expect(s.pulls).toEqual([undefined, undefined]);
  expect(s.state().cursor).toBeUndefined();
  expect(s.cupboard()).toEqual(['milk']);
  s.engine.stop();
});
