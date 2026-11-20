// Lane 3 probes (20 Nov audit), store level with a pretend server.
// Run: npx jest --testMatch '<rootDir>/docs/audits/2026-11-20-deep-audit/tools/L3/*.probe.test.tsx' --rootDir .
// Each test asserts the CURRENT behaviour, so a pass = the finding reproduces.
import { act } from '@testing-library/react-native';

import type { Row } from '@/domain/sync/rows';
import { useAccount } from '@/store/account';
import { signOut } from '@/store/accountActions';
import { useHousehold, leave, startSync, stopSync } from '@/store/household';
import { useMyRecipes } from '@/store/myRecipes';
import { usePlan } from '@/store/plan';

const mockState = { house: undefined as unknown, pushed: [] as Row[] };

jest.mock('@/lib/account', () => ({
  sessionReady: async () => true,
  currentAccount: async () => ({ ok: true, value: { id: 'u1', email: 'a@b.co', apple: false, name: undefined } }),
  signOut: async () => ({ ok: true, value: null }),
  deleteAccount: async () => ({ ok: true, value: null }),
  pullAccountRows: async () => ({ ok: true, value: [] }),
  pullAccountRowsSince: async () => ({ ok: true, value: { rows: [], newest: undefined } }),
  pushAccountRows: async () => ({ ok: true, value: null }),
  listenAccount: () => () => undefined,
}));
jest.mock('@/lib/household', () => ({
  // A session auth-js removed (dead refresh token) makes signedInUser sign in anonymously: a NEW id.
  signedInUser: async () => ({ ok: true, value: 'new-anon' }),
  myHousehold: async () => ({ ok: true, value: mockState.house }),
  leaveHousehold: async () => ({ ok: true, value: null }),
  pullRows: async () => ({ ok: true, value: [] }),
  pullRowsSince: async () => ({ ok: true, value: { rows: [], newest: undefined } }),
  pushRows: async (_h: string, _u: string, rows: Row[]) => {
    mockState.pushed.push(...rows);
    return { ok: true, value: null };
  },
  listen: () => () => undefined,
}));

const bigRecipe: Row = { kind: 'myrecipe', key: 'my-big', data: { id: 'my-big' }, deleted: false, updatedAt: 1 };
const flush = () => act(async () => new Promise((r) => setTimeout(r, 50)));

beforeEach(() => {
  stopSync();
  mockState.house = undefined;
  mockState.pushed = [];
});

test('signOut succeeds and wipes the phone while a set-aside row (never on the server) is only on this phone', async () => {
  useAccount.setState({ who: { id: 'u1', email: 'a@b.co', apple: false, name: undefined }, status: 'signed-in', needsMerge: false, pending: {}, setAside: { 'myrecipe:my-big': bigRecipe } });
  useMyRecipes.setState({ recipes: { 'my-big': { id: 'my-big' } as never } });
  const r = await signOut();
  expect(r.ok).toBe(true);
  expect(useMyRecipes.getState().recipes).toEqual({}); // gone from the phone, and the server never had it
  expect(useAccount.getState().setAside).toEqual({});
});

test('leave() drops household rows still waiting to send: the others never get them', async () => {
  const row: Row = { kind: 'plan', key: 'e9', data: { recipeId: 'r', day: '2026-11-24', slot: 'dinner', servings: 2 }, deleted: false, updatedAt: 9 };
  useHousehold.setState({ household: { id: 'h1', name: 'Ours', members: [] }, userId: 'u1', pending: { 'plan:e9': row } });
  const r = await leave();
  expect(r.ok).toBe(true);
  expect(useHousehold.getState().pending).toEqual({});
  expect(mockState.pushed).toHaveLength(0);
});

test('a dropped session turns a household-only phone into a new anonymous user and it silently leaves its household, losing unsent changes', async () => {
  const row: Row = { kind: 'cupboard', key: 'feta', data: { addedAt: 1, source: 'manual' }, deleted: false, updatedAt: 9 };
  usePlan.setState({ entries: [], listEdits: {} });
  useHousehold.setState({ household: { id: 'h1', name: 'Ours', members: [{ userId: 'old-anon', name: 'Sam' }] }, userId: 'old-anon', pending: { 'cupboard:feta': row } });
  mockState.house = undefined; // the server: 'new-anon' is in no household
  startSync();
  await flush();
  expect(useHousehold.getState().userId).toBe('new-anon');
  expect(useHousehold.getState().household).toBeUndefined();
  expect(useHousehold.getState().pending).toEqual({});
});
