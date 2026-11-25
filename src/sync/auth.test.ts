import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_STATE, type SyncState } from './trigger';

// The Supabase client and the local store are replaced, so these run with no network and no IndexedDB.
const h = vi.hoisted(() => ({
  state: {} as SyncState,
  session: null as { user: { id: string; email: string } } | null,
  pull: vi.fn(async () => [] as unknown[]),
  push: vi.fn(async () => {}),
  getUser: vi.fn(async () => ({ data: { user: null as unknown }, error: null as unknown })),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  cleared: 0,
}));

vi.mock('./client', () => ({
  remote: { pull: h.pull, push: h.push },
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: h.session } }),
      getUser: h.getUser,
      signInWithPassword: h.signInWithPassword,
      signUp: h.signUp,
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('./store', () => ({
  dexieStore: {
    getState: async () => h.state,
    setState: async (patch: Partial<SyncState>) => void (h.state = { ...h.state, ...patch }),
    index: async () => ({ questions: new Map(), mockExams: new Map(), settingsUpdatedAt: null, attemptIds: new Set() }),
    write: async () => {},
    all: async () => ({ questions: [], mockExams: [], settings: null, attempts: [] }),
    clear: async () => void h.cleared++,
  },
}));

import { messageFor, replaceDeviceData, signIn, signUp, syncNow } from './auth';

beforeEach(() => {
  h.state = { ...EMPTY_STATE };
  h.session = null;
  h.cleared = 0;
  h.pull.mockReset().mockResolvedValue([]);
  h.push.mockReset().mockResolvedValue(undefined);
  h.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  h.signInWithPassword.mockReset();
  h.signUp.mockReset();
  vi.unstubAllGlobals();
});

describe('messageFor', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'Wrong email or password.'],
    [{ code: 'user_already_exists' }, 'This email already has an account. Sign in instead.'],
    [{ code: 'otp_expired' }, 'That code is wrong or has expired. Send a new one.'],
    [{ code: 'over_email_send_rate_limit' }, 'Too many emails sent. Try again in a few minutes.'],
    [{ code: 'weak_password' }, 'Use 8 characters or more.'],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'Could not reach the account service. Try again.'],
    [{ message: 'something else' }, 'Could not reach the account service. Try again.'],
  ])('maps %j to its message', (error, text) => {
    expect(messageFor(error)).toBe(text);
  });

  it('says offline only when the device is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(messageFor({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(
      'You are offline. Try again when you are connected.',
    );
  });
});

describe('signUp', () => {
  it('puts an email that already has an account on the email field', async () => {
    h.signUp.mockResolvedValue({ data: { user: { id: 'X', identities: [] } }, error: null });
    expect(await signUp('b@example.test', 'password1')).toEqual({
      ok: false,
      error: 'This email already has an account. Sign in instead.',
      field: 'email',
    });
  });

  it('puts a short password on the password field', async () => {
    h.signUp.mockResolvedValue({ data: { user: null }, error: { code: 'weak_password' } });
    expect(await signUp('b@example.test', 'short')).toEqual({ ok: false, error: 'Use 8 characters or more.', field: 'password' });
  });

  it('keeps a service error for the whole form', async () => {
    h.signUp.mockResolvedValue({ data: { user: null }, error: { code: 'over_email_send_rate_limit' } });
    expect(await signUp('b@example.test', 'password1')).toEqual({
      ok: false,
      error: 'Too many emails sent. Try again in a few minutes.',
    });
  });
});

describe('signIn', () => {
  const asUser = (id: string) => {
    h.session = { user: { id, email: `${id}@example.test` } };
    h.signInWithPassword.mockResolvedValue({ data: { user: { id } }, error: null });
  };

  it('signs in and syncs when the device has no account yet', async () => {
    asUser('B');
    expect(await signIn('b@example.test', 'password1')).toEqual({ ok: true });
    await syncNow();
    expect(h.state).toMatchObject({ signedIn: true, userId: 'B' });
    expect(h.pull).toHaveBeenCalled();
  });

  it('asks before mixing two accounts', async () => {
    h.state = { ...EMPTY_STATE, userId: 'A' };
    asUser('B');
    expect(await signIn('b@example.test', 'password1')).toEqual({ ok: false, otherAccount: true });
    await syncNow();
    expect(h.state.signedIn).toBe(false);
    expect(h.pull).not.toHaveBeenCalled();
    expect(h.push).not.toHaveBeenCalled();
  });

  it('replaces the device data only when told to', async () => {
    h.state = { ...EMPTY_STATE, userId: 'A', pulledAt: '2026-11-01T00:00:00.000Z' };
    asUser('B');
    await signIn('b@example.test', 'password1');
    await replaceDeviceData();
    expect(h.cleared).toBe(1);
    expect(h.state).toMatchObject({ userId: 'B', signedIn: true });
    expect(h.pull).toHaveBeenCalledWith({ at: EMPTY_STATE.pulledAt, id: '' }, 1000);
  });

  it('reports a wrong password in plain words', async () => {
    h.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: 'invalid_credentials' } });
    expect(await signIn('b@example.test', 'nope')).toEqual({ ok: false, error: 'Wrong email or password.', field: 'password' });
  });
});

describe('syncNow', () => {
  it('does nothing signed out', async () => {
    await syncNow();
    expect(h.pull).not.toHaveBeenCalled();
  });

  it('runs one sync at a time', async () => {
    h.session = { user: { id: 'A', email: 'a@example.test' } };
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true };
    await Promise.all([syncNow(), syncNow(), syncNow()]);
    expect(h.pull).toHaveBeenCalledTimes(1);
  });

  it('turns signed out when the server rejects the session', async () => {
    h.session = { user: { id: 'A', email: 'a@example.test' } };
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true };
    h.pull.mockRejectedValue(new Error('JWT expired'));
    h.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, code: 'session_not_found' } });
    await syncNow();
    expect(h.state.signedIn).toBe(false);
    expect(h.state.lastError).toBeTruthy();
  });

  it('stays signed in when the network is down', async () => {
    h.session = { user: { id: 'A', email: 'a@example.test' } };
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true };
    h.pull.mockRejectedValue(new TypeError('Failed to fetch'));
    h.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
    await syncNow();
    expect(h.state.signedIn).toBe(true);
    expect(h.state.lastError).toMatch(/Failed to fetch/);
  });

  it('starts over from the beginning after a restore', async () => {
    h.session = { user: { id: 'A', email: 'a@example.test' } };
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true, pulledAt: '2026-11-01T00:00:00.000Z', pulledId: 'x', pushedAt: '2026-11-01T00:00:00.000Z' };
    await syncNow({ full: true });
    expect(h.pull).toHaveBeenCalledWith({ at: EMPTY_STATE.pulledAt, id: '' }, 1000);
  });
});
