// Apple's sign-in can be revoked when the account is deleted (S2-4, client half):
// signing in hands Apple's one-time code to the server, which never blocks
// signing in, and deleting goes through the function that revokes it.
import { continueWithApple, deleteAccount } from './account';

const mockInvoke = jest.fn();
const mockRpc = jest.fn();
const user = { id: 'u1', is_anonymous: false, email: 'a@b.c', identities: [{ provider: 'apple' }], app_metadata: {} };
const mockAuth = {
  getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
  signInWithIdToken: jest.fn(async () => ({ data: { user }, error: null })),
  getUser: jest.fn(async () => ({ data: { user } })),
  signOut: jest.fn(async () => ({ error: null })),
};

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: async () => ({ identityToken: 'id-token', authorizationCode: 'one-time-code', fullName: null }),
}));
jest.mock('./supabase', () => ({
  supabase: () => ({
    auth: mockAuth,
    rpc: (...a: unknown[]) => mockRpc(...a),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));

beforeEach(() => jest.clearAllMocks());

describe('signing in with Apple', () => {
  it('sends Apple’s code to the server to keep', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    expect((await continueWithApple()).ok).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('apple-token', { body: { authorizationCode: 'one-time-code' } });
  });

  it('still signs in when keeping the code fails', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));
    expect((await continueWithApple()).ok).toBe(true);
  });
});

describe('deleting the account', () => {
  it('goes through the function that revokes Apple first', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    expect(await deleteAccount()).toEqual({ ok: true, value: null });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('falls back to the database call while the function is not deployed', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError', message: 'not found', context: { status: 404 } } });
    mockRpc.mockResolvedValue({ error: null });
    expect(await deleteAccount()).toEqual({ ok: true, value: null });
    expect(mockRpc).toHaveBeenCalledWith('delete_account');
  });

  it('stops, deleting nothing, when the function fails for another reason (Apple unreachable)', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: 'FunctionsHttpError', message: 'apple unreachable', context: { status: 502 } },
    });
    expect((await deleteAccount()).ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });
});
