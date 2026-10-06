// The household sync (D-039) against a pretend server held in memory: what
// one phone changes reaches the server, and what another phone writes lands
// in this phone's plan, list and cupboard.
import { act } from '@testing-library/react-native';

import type { Row } from '@/domain/household/rows';
import { useCupboard } from './cupboard';
import { joinWithCode, leave, startHousehold, stopSync, useHousehold } from './household';
import { usePlan } from './plan';

const mockServer: { rows: Map<string, Row>; onRow?: (r: Row) => void; joined: boolean } = { rows: new Map(), joined: false };
const mockHousehold = { id: 'h1', name: 'Our kitchen', members: [{ userId: 'me', name: 'Lachlan' }] };

jest.mock('@/lib/household', () => ({
  signedInUser: async () => ({ ok: true, value: 'me' }),
  createHousehold: async () => ({ ok: true, value: 'h1' }),
  joinHousehold: async () => {
    mockServer.joined = true;
    return { ok: true, value: 'h1' };
  },
  createInvite: async () => ({ ok: true, value: 'ABCD2345' }),
  leaveHousehold: async () => ({ ok: true, value: null }),
  myHousehold: async () => ({ ok: true, value: mockHousehold }),
  pullRows: async () => ({ ok: true, value: [...mockServer.rows.values()] }),
  pushRows: async (_h: string, _u: string, rows: Row[]) => {
    for (const r of rows) mockServer.rows.set(`${r.kind}:${r.key}`, r);
    return { ok: true, value: null };
  },
  listen: (_h: string, onRow: (r: Row) => void) => {
    mockServer.onRow = onRow;
    return () => undefined;
  },
}));

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 600));
  });

beforeEach(() => {
  stopSync();
  mockServer.rows.clear();
  mockServer.joined = false;
  usePlan.setState({ entries: [], listEdits: {} });
  useCupboard.setState({ items: [] });
  useHousehold.setState({ household: undefined, userId: undefined, mirror: {}, pending: {}, sharedRecipes: {}, status: 'idle' });
});

describe('household sync', () => {
  it('starting a household sends this phone’s kitchen, then each change after it', async () => {
    usePlan.getState().addEntry('carbonara', '2026-10-06', 'dinner', 4);
    await act(async () => {
      await startHousehold('Lachlan');
    });
    await settle();
    expect([...mockServer.rows.values()].some((r) => r.kind === 'plan' && !r.deleted)).toBe(true);

    await act(async () => useCupboard.getState().add(['egg'], 'manual'));
    await settle();
    expect(mockServer.rows.get('cupboard:egg')?.deleted).toBe(false);
    expect(useHousehold.getState().pending).toEqual({});
  });

  it('a tick from another phone lands on this phone’s list, and an older one doesn’t undo a newer one', async () => {
    await act(async () => {
      await startHousehold('Lachlan');
    });
    await settle();
    const tick: Row = {
      kind: 'tick',
      key: '2026-10-05|spaghetti',
      data: { amount: '400 g' },
      deleted: false,
      updatedAt: Date.now() + 1000,
      updatedBy: 'sam',
    };
    await act(async () => mockServer.onRow?.(tick));
    expect(usePlan.getState().listEdits['2026-10-05']?.checked.spaghetti).toBe('400 g');
    await act(async () => mockServer.onRow?.({ ...tick, deleted: true, data: null, updatedAt: 5 }));
    expect(usePlan.getState().listEdits['2026-10-05']?.checked.spaghetti).toBe('400 g');
  });

  it('joining brings this phone’s cupboard along and takes the household’s plan', async () => {
    mockServer.rows.set('plan:e9', {
      kind: 'plan',
      key: 'e9',
      data: { recipeId: 'pho', day: '2026-10-07', slot: 'dinner', servings: 2 },
      deleted: false,
      updatedAt: 1,
      updatedBy: 'sam',
    });
    useCupboard.getState().add(['milk'], 'manual');
    await act(async () => {
      await joinWithCode('ABCD2345', 'Lachlan');
    });
    await settle();
    expect(usePlan.getState().entries.map((e) => e.recipeId)).toEqual(['pho']);
    expect(useCupboard.getState().items.map((i) => i.ingredientId)).toEqual(['milk']);
    expect(mockServer.rows.get('cupboard:milk')?.deleted).toBe(false);
  });

  it('leaving keeps the kitchen on this phone and stops sharing', async () => {
    await act(async () => {
      await startHousehold('Lachlan');
    });
    useCupboard.getState().add(['egg'], 'manual');
    await act(async () => {
      await leave();
    });
    expect(useHousehold.getState().household).toBeUndefined();
    expect(useCupboard.getState().items).toHaveLength(1);
  });
});
