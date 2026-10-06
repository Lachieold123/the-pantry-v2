// Accounts (D-043) against a pretend Supabase held in memory: linking Apple
// to this phone's user, switching to an account that already has things and
// merging, the email code, signing out (refused while changes wait, then a
// clean phone), deleting, and the once-only offer.
import { act } from '@testing-library/react-native';

import type { Row } from '@/domain/sync/rows';
import { offerAccount, takeOffer, useAccount, watchOffers } from './account';
import { deleteAccount, sendCode, signInWithApple, signOut, verifyCode } from './accountActions';
import { accountEngine } from './accountSync';
import { useCupboard } from './cupboard';
import { adoptHousehold, leave, useHousehold } from './household';
import { usePlan } from './plan';
import { usePreferences } from './preferences';
import { useSaved } from './saved';

const mockMe = { id: 'u1', email: 'lachlan@example.com', apple: true, name: 'Lachlan' };
const mockServer: { rows: Map<string, Row>; apple: unknown; verify: unknown; deleted: boolean; signedOut: boolean } = {
  rows: new Map(),
  apple: undefined,
  verify: undefined,
  deleted: false,
  signedOut: false,
};

jest.mock('@/lib/account', () => ({
  sessionReady: async () => true,
  currentAccount: async () => ({ ok: true, value: mockMe }),
  continueWithApple: async () => mockServer.apple,
  sendEmailCode: async () => ({ ok: true, value: 'email_change' }),
  verifyEmailCode: async () => mockServer.verify,
  signOut: async () => {
    mockServer.signedOut = true;
    return { ok: true, value: null };
  },
  deleteAccount: async () => {
    mockServer.deleted = true;
    return { ok: true, value: null };
  },
  pullAccountRows: async () => ({ ok: true, value: [...mockServer.rows.values()] }),
  pushAccountRows: async (_u: string, _by: string, rows: Row[]) => {
    for (const r of rows) mockServer.rows.set(`${r.kind}:${r.key}`, r);
    return { ok: true, value: null };
  },
  listenAccount: () => () => undefined,
}));
jest.mock('@/lib/household', () => ({
  signedInUser: async () => ({ ok: true, value: 'u1' }),
  myHousehold: async () => ({ ok: true, value: mockHouse.current }),
  leaveHousehold: async () => ({ ok: true, value: null }),
  pullRows: async () => ({ ok: true, value: mockHouseRows }),
  pushRows: async () => ({ ok: true, value: null }),
  listen: () => () => undefined,
}));

let mockHouseRows: Row[] = [];
const mockHouse: { current: unknown } = { current: undefined };

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 600));
  });
const row = (kind: Row['kind'], key: string, data: unknown): Row => ({
  kind,
  key,
  data,
  deleted: false,
  updatedAt: 5,
  updatedBy: 'phone-b',
});

beforeEach(() => {
  accountEngine.stop();
  mockServer.rows.clear();
  Object.assign(mockServer, { deleted: false, signedOut: false, apple: { ok: true, value: { account: mockMe, switched: false } } });
  usePlan.setState({ entries: [], listEdits: {} });
  useCupboard.setState({ items: [] });
  useSaved.setState({ bookmarks: [], collections: [], hidden: [], recentlyViewed: [] });
  usePreferences.setState({ onboarded: true, diet: 'everything', appearance: 'dark' });
  useHousehold.setState({ household: undefined, mirror: {}, pending: {} });
  useAccount.setState({
    status: 'signed-out',
    who: undefined,
    mirror: {},
    pending: {},
    needsMerge: false,
    code: undefined,
    offered: {},
    offer: undefined,
  });
});

describe('signing in', () => {
  it('links Apple to this phone’s user and backs up everything on it, then each change after', async () => {
    usePlan.getState().addEntry('carbonara', '2026-10-06', 'dinner', 4);
    useSaved.getState().toggleBookmark('pho');
    await act(async () => {
      await signInWithApple();
    });
    await settle();
    expect(useAccount.getState().status).toBe('signed-in');
    expect(mockServer.rows.get('bookmark:pho')?.deleted).toBe(false);
    expect([...mockServer.rows.values()].some((r) => r.kind === 'plan')).toBe(true);
    expect(mockServer.rows.get('prefs:diet')?.data).toEqual({ value: 'everything' });

    await act(async () => useCupboard.getState().add(['egg'], 'manual'));
    await settle();
    expect(mockServer.rows.get('cupboard:egg')?.deleted).toBe(false);
    expect(useAccount.getState().pending).toEqual({});
  });

  it('switching to an account that already has things keeps them first and adds this phone’s', async () => {
    mockServer.apple = { ok: true, value: { account: mockMe, switched: true } };
    mockServer.rows.set('bookmark:laksa', row('bookmark', 'laksa', { savedAt: 1 }));
    mockServer.rows.set('prefs:diet', row('prefs', 'diet', { value: 'vegetarian' }));
    mockServer.rows.set('plan:e9', row('plan', 'e9', { recipeId: 'pho', day: '2026-10-07', slot: 'dinner', servings: 2 }));
    useSaved.getState().toggleBookmark('pho');
    useSaved.getState().toggleBookmark('laksa');
    usePlan.getState().addEntry('pho', '2026-10-07', 'dinner', 4);
    await act(async () => {
      await signInWithApple();
    });
    await settle();
    expect(
      useSaved
        .getState()
        .bookmarks.map((b) => b.recipeId)
        .sort(),
    ).toEqual(['laksa', 'pho']);
    // The account's setting wins; the same meal isn't doubled.
    expect(usePreferences.getState().diet).toBe('vegetarian');
    expect(usePlan.getState().entries.map((e) => e.id)).toEqual(['e9']);
    // The theme stays this phone's own.
    expect(usePreferences.getState().appearance).toBe('dark');
    expect(mockServer.rows.get('bookmark:pho')?.deleted).toBe(false);
  });

  it('cancelling Apple’s sheet changes nothing', async () => {
    mockServer.apple = { ok: false, problem: 'cancelled' };
    let result: unknown;
    await act(async () => {
      result = await signInWithApple();
    });
    expect(result).toEqual({ ok: false, problem: 'cancelled' });
    expect(useAccount.getState().status).toBe('signed-out');
  });
});

describe('the email code', () => {
  it('sends a code, then signs in with it', async () => {
    mockServer.verify = { ok: true, value: { account: { ...mockMe, apple: false }, switched: false } };
    await act(async () => {
      expect((await sendCode(' Lachlan@Example.com ')).ok).toBe(true);
    });
    expect(useAccount.getState().code?.email).toBe('lachlan@example.com');
    await act(async () => {
      expect((await verifyCode('123 456')).ok).toBe(true);
    });
    expect(useAccount.getState().status).toBe('signed-in');
    expect(useAccount.getState().code).toBeUndefined();
  });

  it('says a wrong code is wrong, and stays signed out', async () => {
    mockServer.verify = { ok: false, problem: 'code-wrong' };
    await act(async () => {
      await sendCode('lachlan@example.com');
    });
    let result: unknown;
    await act(async () => {
      result = await verifyCode('000000');
    });
    expect(result).toEqual({ ok: false, problem: 'code-wrong' });
    expect(useAccount.getState().status).toBe('signed-out');
  });

  it('won’t send to an email that can’t be right', async () => {
    expect(await sendCode('lachlan@')).toEqual({ ok: false, problem: 'email-invalid' });
  });
});

describe('the kitchen moving between the account and a household', () => {
  it('joining sends the kitchen to the household without deleting it from the account; leaving makes the account match this phone', async () => {
    usePlan.getState().addEntry('carbonara', '2026-10-06', 'dinner', 4);
    useCupboard.getState().add(['egg'], 'manual');
    await act(async () => {
      await signInWithApple();
    });
    await settle();
    const before = mockServer.rows.size;

    mockHouseRows = [row('cupboard', 'milk', { addedAt: 1, source: 'manual' })];
    mockHouse.current = { id: 'h1', name: 'Our kitchen', members: [] };
    await act(async () => {
      await adoptHousehold({ id: 'h1', name: 'Our kitchen', members: [] }, 'u1');
    });
    await settle();
    // In the household: both jars, and the account was sent nothing for the move.
    expect(
      useCupboard
        .getState()
        .items.map((i) => i.ingredientId)
        .sort(),
    ).toEqual(['egg', 'milk']);
    expect([...mockServer.rows.values()].filter((r) => r.deleted)).toEqual([]);
    expect(mockServer.rows.size).toBe(before);

    mockHouse.current = undefined;
    await act(async () => {
      await leave();
    });
    await settle();
    // Out again: the phone keeps the household's kitchen, and the account now holds exactly that, once.
    expect(
      useCupboard
        .getState()
        .items.map((i) => i.ingredientId)
        .sort(),
    ).toEqual(['egg', 'milk']);
    expect(mockServer.rows.get('cupboard:milk')?.deleted).toBe(false);
    expect(mockServer.rows.get('cupboard:egg')?.deleted).toBe(false);
    expect([...mockServer.rows.values()].filter((r) => r.kind === 'plan' && !r.deleted)).toHaveLength(1);
    mockHouseRows = [];
  });
});

describe('signing out and deleting', () => {
  const signIn = async () => {
    await act(async () => {
      await signInWithApple();
    });
    await settle();
  };

  it('refuses while changes are waiting to send, and keeps everything', async () => {
    await signIn();
    const waiting = row('bookmark', 'pho', { savedAt: 1 });
    useAccount.setState({ pending: { 'bookmark:pho': waiting } });
    jest.spyOn(accountEngine, 'flush').mockResolvedValueOnce(undefined);
    let result: unknown;
    await act(async () => {
      result = await signOut();
    });
    expect(result).toEqual({ ok: false, problem: 'unsaved' });
    expect(useAccount.getState().status).toBe('signed-in');
    expect(mockServer.signedOut).toBe(false);
  });

  it('clears this phone back to a fresh start that skips the welcome', async () => {
    useSaved.getState().toggleBookmark('pho');
    await signIn();
    await act(async () => {
      expect((await signOut()).ok).toBe(true);
    });
    expect(mockServer.signedOut).toBe(true);
    expect(useAccount.getState().status).toBe('signed-out');
    expect(useSaved.getState().bookmarks).toEqual([]);
    expect(usePreferences.getState().onboarded).toBe(true);
    expect(usePreferences.getState().appearance).toBe('dark');
    // The account still has it.
    expect(mockServer.rows.get('bookmark:pho')?.deleted).toBe(false);
  });

  it('deleting the account removes it on the server and clears this phone', async () => {
    useSaved.getState().toggleBookmark('pho');
    await signIn();
    await act(async () => {
      expect((await deleteAccount()).ok).toBe(true);
    });
    expect(mockServer.deleted).toBe(true);
    expect(useAccount.getState().who).toBeUndefined();
    expect(useSaved.getState().bookmarks).toEqual([]);
  });
});

describe('offering an account', () => {
  it('offers once at the 10th Cookmark, and never again after Not now', async () => {
    watchOffers();
    for (let i = 1; i <= 9; i++) useSaved.getState().toggleBookmark(`r${i}`);
    expect(useAccount.getState().offer).toBeUndefined();
    useSaved.getState().toggleBookmark('r10');
    expect(takeOffer()).toBe('cookmarks');
    useSaved.getState().toggleBookmark('r11');
    offerAccount('cookmarks');
    expect(takeOffer()).toBeUndefined();
  });

  it('never offers once signed in', () => {
    useAccount.setState({ who: mockMe });
    offerAccount('household');
    expect(takeOffer()).toBeUndefined();
  });
});
