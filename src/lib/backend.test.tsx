// The account and household calls against a pretend Supabase (REL-15): how
// errors read on screen, an expired sign-in offline (BUG-05, BUG-16), paging
// past 1,000 rows, and which push failures count as refusals (BUG-03).
import { currentAccount, problemFrom as accountProblem, pullAccountRows, sessionReady } from './account';
import { joinHousehold, previewInvite, problemFrom as householdProblem, signedInUser } from './household';
import { isRejection } from './pushRows';

const mockAuth = {
  getSession: jest.fn(),
  signInAnonymously: jest.fn(),
};
const mockRpc = jest.fn();
let mockRows: { kind: string; key: string; updated_at: number }[] = [];
const mockOrders: string[] = [];

jest.mock('expo-apple-authentication', () => ({}));
jest.mock('./supabase', () => ({
  supabase: () => ({
    auth: mockAuth,
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: (col: string) => {
          mockOrders.push(col);
          return q;
        },
        range: async (from: number, to: number) => {
          const sorted = [...mockRows].sort(
            (a, b) => a.updated_at - b.updated_at || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key),
          );
          return { data: sorted.slice(from, to + 1).map((r) => ({ ...r, data: {}, deleted: false, updated_by: 'x' })), error: null };
        },
      };
      return q;
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOrders.length = 0;
});

describe('error words (REL-15)', () => {
  it('reads real Supabase error shapes', () => {
    expect(accountProblem({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe('code-wrong');
    expect(accountProblem({ code: 'over_email_send_rate_limit', message: 'rate limit' })).toBe('too-many');
    expect(accountProblem({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe('offline');
    expect(accountProblem({ code: 'manual_linking_disabled', message: 'Manual linking is disabled' })).toBe('sign-ins-off');
    expect(accountProblem({ code: 'email_address_invalid', message: 'Email address is invalid' })).toBe('email-invalid');
    expect(accountProblem({ code: 'ERR_REQUEST_CANCELED', message: 'cancelled' })).toBe('cancelled');
    expect(accountProblem({ code: 'identity_already_exists', message: 'Identity is already linked' })).toBe('failed');
    expect(householdProblem('invite-not-found')).toBe('invite-not-found');
    expect(householdProblem('TypeError: Network request failed')).toBe('offline');
    expect(householdProblem('Anonymous sign-ins are disabled')).toBe('sharing-off');
  });
});

describe('an expired sign-in while offline (BUG-05, BUG-16)', () => {
  const offline = { data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } };
  it('reads as offline, not signed out', async () => {
    mockAuth.getSession.mockResolvedValue(offline);
    expect(await currentAccount()).toEqual({ ok: false, problem: 'offline' });
    expect(await sessionReady()).toBe(false);
  });
  it('never swaps the saved sign-in for a new anonymous one', async () => {
    mockAuth.getSession.mockResolvedValue(offline);
    expect(await signedInUser()).toEqual({ ok: false, problem: 'offline' });
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('signs in anonymously only when there is no saved sign-in at all', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon' } }, error: null });
    expect(await signedInUser()).toEqual({ ok: true, value: 'anon' });
  });
});

describe('paging', () => {
  it('reads every row past 1,000, in a total order, even when many share a time', async () => {
    mockRows = Array.from({ length: 2345 }, (_, i) => ({
      kind: i % 2 ? 'tick' : 'plan',
      key: `k${i}`,
      updated_at: 1000 + Math.floor(i / 500),
    }));
    const pulled = await pullAccountRows('u');
    expect(pulled.ok && pulled.value.length).toBe(2345);
    expect(pulled.ok && new Set(pulled.value.map((r) => r.key)).size).toBe(2345);
    expect(mockOrders.slice(0, 3)).toEqual(['updated_at', 'kind', 'key']);
  });
});

describe('refusals (BUG-03)', () => {
  it('counts bad data and failed checks as refusals, and nothing else', () => {
    expect(isRejection({ code: '23514' })).toBe(true); // check_violation: a key over 200
    expect(isRejection({ code: '22001' })).toBe(true); // string too long
    expect(isRejection({ code: '42501' })).toBe(false); // row security: try later
    expect(isRejection({ code: 'PGRST301' })).toBe(false); // expired token
    expect(isRejection(undefined)).toBe(false);
  });
});

describe('invite codes (SEC-08, SEC-16)', () => {
  beforeEach(() => mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'me' } } }, error: null }));
  it('reads a wrong code (null from the server) as "invite not found"', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    expect(await joinHousehold('WRONG123', 'Sam')).toEqual({ ok: false, problem: 'invite-not-found' });
  });
  it('says when there have been too many wrong codes', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'too-many-attempts' } });
    expect(await joinHousehold('WRONG123', 'Sam')).toEqual({ ok: false, problem: 'too-many-attempts' });
  });
  it('previews the household a code is for', async () => {
    mockRpc.mockResolvedValue({ data: [{ household_name: 'Our place', member_count: 2 }], error: null });
    expect(await previewInvite('ABCD2345')).toEqual({ ok: true, value: { name: 'Our place', members: 2 } });
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await previewInvite('ABCD2345')).toEqual({ ok: true, value: undefined });
  });
});
