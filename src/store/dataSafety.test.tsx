// Unsent work is never thrown away silently (20 Nov audit, DATA-4, -5, -7, -10,
// -12, -15, -16): it's kept, sent, or the person is told. A pretend server.
import { act } from '@testing-library/react-native';

import type { Row } from '@/domain/sync/rows';
import { useAccount } from './account';
import { signOut, startAccount } from './accountActions';
import { accountEngine } from './accountSync';
import { adoptHousehold, leave, startSync, stopSync, useHousehold } from './household';
import { useMyRecipes } from './myRecipes';
import { usePlan } from './plan';

const mockState = {
  house: undefined as unknown,
  houseRows: [] as Row[],
  pushed: [] as Row[],
  session: 'old-anon' as string | undefined,
  pushOk: true,
  account: { id: 'u1', email: 'a@b.co', apple: false, name: undefined } as unknown,
  pulls: 0,
};

jest.mock('@/lib/account', () => ({
  sessionReady: async () => true,
  currentAccount: async () => ({ ok: true, value: mockState.account }),
  signOut: async () => ({ ok: true, value: null }),
  deleteAccount: async () => ({ ok: true, value: null }),
  pullAccountRows: async () => ({ ok: true, value: [] }),
  pullAccountRowsSince: async () => ({ ok: true, value: { rows: [], newest: undefined } }),
  pushAccountRows: async () => ({ ok: true, value: null }),
  listenAccount: () => () => undefined,
}));
jest.mock('@/lib/household', () => ({
  // Like the real one: no saved sign-in, and a new quiet user only when allowed.
  signedInUser: async (mayStartNew = false) => {
    if (mockState.session) return { ok: true, value: mockState.session };
    if (!mayStartNew) return { ok: false, problem: 'signed-out' };
    mockState.session = 'new-anon';
    return { ok: true, value: 'new-anon' };
  },
  myHousehold: async () => (mockState.session ? { ok: true, value: mockState.house } : { ok: false, problem: 'signed-out' }),
  leaveHousehold: async () => ({ ok: true, value: null }),
  pullRows: async () => {
    mockState.pulls += 1;
    return { ok: true, value: mockState.houseRows };
  },
  pullRowsSince: async () => ({ ok: true, value: { rows: [], newest: undefined } }),
  pushRows: async (_h: string, _u: string, rows: Row[]) => {
    if (!mockState.pushOk) return { ok: false };
    mockState.pushed.push(...rows);
    return { ok: true, value: null };
  },
  listen: () => () => undefined,
}));

const house = { id: 'h1', name: 'Ours', members: [{ userId: 'old-anon', name: 'Sam' }] };
const feta: Row = { kind: 'cupboard', key: 'feta', data: { addedAt: 1, source: 'manual' }, deleted: false, updatedAt: 9 };
const settle = () => act(async () => new Promise((r) => setTimeout(r, 50)));

beforeEach(() => {
  stopSync();
  accountEngine.stop();
  Object.assign(mockState, { house: undefined, houseRows: [], pushed: [], session: 'old-anon', pushOk: true, pulls: 0 });
  mockState.account = { id: 'u1', email: 'a@b.co', apple: false, name: undefined };
  usePlan.setState({ entries: [], listEdits: {} });
  useMyRecipes.setState({ recipes: {} });
  useHousehold.setState({
    household: undefined,
    userId: undefined,
    mirror: {},
    pending: {},
    setAside: {},
    sharedRecipes: {},
    rejoin: undefined,
    unsent: undefined,
  });
  useAccount.setState({
    who: undefined,
    status: 'signed-out',
    needsMerge: false,
    pending: {},
    setAside: {},
    mirror: {},
    lapsed: undefined,
    lapsedNotice: false,
  });
});

describe('a dead sharing sign-in (DATA-4)', () => {
  it('never becomes a new quiet user; keeps unsent changes and says to rejoin', async () => {
    useHousehold.setState({ household: house, userId: 'old-anon', pending: { 'cupboard:feta': feta } });
    mockState.session = undefined; // auth-js dropped the refused session
    startSync();
    await settle();
    const s = useHousehold.getState();
    expect(mockState.session).toBeUndefined(); // no anonymous sign-in happened
    expect(s.household).toBeUndefined();
    expect(s.rejoin).toBe('Ours');
    expect(s.unsent).toEqual({ householdId: 'h1', rows: { 'cupboard:feta': feta } });
  });

  it('rejoining the same household sends what was kept', async () => {
    useHousehold.setState({ unsent: { householdId: 'h1', rows: { 'cupboard:feta': feta } }, rejoin: 'Ours' });
    mockState.session = 'new-anon';
    mockState.house = house;
    await act(async () => {
      await adoptHousehold(house, 'new-anon');
    });
    await settle();
    expect(mockState.pushed.some((r) => r.kind === 'cupboard' && r.key === 'feta')).toBe(true);
    expect(useHousehold.getState().unsent).toBeUndefined();
  });

  it('two adoptions at once pull once (DATA-16)', async () => {
    await act(async () => {
      await Promise.all([adoptHousehold(house, 'old-anon'), adoptHousehold(house, 'old-anon')]);
    });
    expect(mockState.pulls).toBe(1);
  });

  it('joining leaves out weeks the plan has let go of (DATA-15)', async () => {
    const old: Row = {
      kind: 'plan',
      key: 'e1',
      data: { recipeId: 'r', day: '2020-01-06', slot: 'dinner', servings: 2 },
      deleted: false,
      updatedAt: 1,
    };
    mockState.houseRows = [old];
    await act(async () => {
      await adoptHousehold(house, 'old-anon');
    });
    expect(useHousehold.getState().mirror['plan:e1']).toBeUndefined();
    expect(usePlan.getState().entries).toEqual([]);
  });
});

describe('leaving (DATA-7, DATA-10)', () => {
  it('sends waiting changes first', async () => {
    useHousehold.setState({ household: house, userId: 'old-anon', pending: { 'cupboard:feta': feta } });
    expect((await leave()).ok).toBe(true);
    expect(mockState.pushed).toContainEqual(feta);
  });

  it('refuses, keeping them, while they can’t be sent', async () => {
    mockState.pushOk = false;
    useHousehold.setState({ household: house, userId: 'old-anon', pending: { 'cupboard:feta': feta } });
    expect(await leave()).toEqual({ ok: false, problem: 'unsent' });
    expect(useHousehold.getState().household).toEqual(house);
    expect(useHousehold.getState().pending['cupboard:feta']).toEqual(feta);
  });

  it('keeps the other members’ recipes the plan still uses', async () => {
    const theirs = { id: 'their-pie', title: 'Pie' } as never;
    usePlan.setState({ entries: [{ id: 'e1', recipeId: 'their-pie', day: '2026-11-24', slot: 'dinner', servings: 2 }] as never });
    useHousehold.setState({ household: house, userId: 'old-anon', sharedRecipes: { 'their-pie': theirs, unused: theirs } });
    await leave();
    expect(Object.keys(useHousehold.getState().sharedRecipes)).toEqual(['their-pie']);
  });
});

describe('signing out and lapsed sign-ins (DATA-5, DATA-12)', () => {
  const who = { id: 'u1', email: 'a@b.co', apple: false, name: undefined };
  const big: Row = { kind: 'myrecipe', key: 'my-big', data: { id: 'my-big' }, deleted: false, updatedAt: 1 };

  it('refuses to sign out while something the server refused is only on this phone', async () => {
    useAccount.setState({ who, status: 'signed-in', setAside: { 'myrecipe:my-big': big } });
    useMyRecipes.setState({ recipes: { 'my-big': { id: 'my-big' } as never } });
    expect(await signOut()).toEqual({ ok: false, problem: 'not-backed-up' });
    expect(useMyRecipes.getState().recipes['my-big']).toBeDefined();
  });

  it('a newer version of a refused record gets its turn again', () => {
    useAccount.setState({ who, status: 'signed-in', setAside: { 'myrecipe:my-big': big } });
    accountEngine.record([{ ...big, updatedAt: 2 }]);
    expect(useAccount.getState().setAside).toEqual({});
  });

  it('a sign-in that lapses by itself says so and keeps unsent changes', async () => {
    const waiting: Row = { kind: 'bookmark', key: 'pho', data: { savedAt: 1 }, deleted: false, updatedAt: 3 };
    useAccount.setState({ who, status: 'signed-in', pending: { 'bookmark:pho': waiting } });
    mockState.account = undefined;
    startAccount();
    await settle();
    const s = useAccount.getState();
    expect(s.who).toBeUndefined();
    expect(s.lapsedNotice).toBe(true);
    expect(s.lapsed).toEqual({ id: 'u1', rows: { 'bookmark:pho': waiting } });
  });
});
