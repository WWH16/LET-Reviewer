import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_STATE, type SyncState } from './trigger';

// The Supabase client and the local store are replaced, so these run with no network and no IndexedDB.
const h = vi.hoisted(() => ({
  state: {} as SyncState,
  session: null as { user: { id: string; email: string } } | null,
  sessionError: null as unknown,
  pull: vi.fn(async () => [] as unknown[]),
  push: vi.fn(async () => {}),
  getUser: vi.fn(async () => ({ data: { user: null as unknown }, error: null as unknown })),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  verifyOtp: vi.fn(),
  saveSettings: vi.fn(async (_patch: unknown) => {}),
  cleared: 0,
}));

vi.mock('./client', () => ({
  remote: { pull: h.pull, push: h.push },
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: h.session }, error: h.sessionError }),
      getUser: h.getUser,
      signInWithPassword: h.signInWithPassword,
      signUp: h.signUp,
      verifyOtp: h.verifyOtp,
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('../db/repo', () => ({ saveSettings: h.saveSettings }));
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

import { confirmSignUp, messageFor, replaceDeviceData, signIn, signUp, syncNow } from './auth';

beforeEach(() => {
  h.state = { ...EMPTY_STATE };
  h.session = null;
  h.sessionError = null;
  h.cleared = 0;
  h.pull.mockReset().mockResolvedValue([]);
  h.push.mockReset().mockResolvedValue(undefined);
  h.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  h.signInWithPassword.mockReset();
  h.signUp.mockReset();
  h.verifyOtp.mockReset();
  h.saveSettings.mockReset().mockResolvedValue(undefined);
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

describe('confirmSignUp', () => {
  beforeEach(() => {
    h.session = { user: { id: 'N', email: 'n@example.test' } };
    h.verifyOtp.mockResolvedValue({ data: { user: { id: 'N' } }, error: null });
  });

  it('opens the welcome for a new account before the app shows', async () => {
    let signedInWhenSaved: boolean | undefined;
    h.saveSettings.mockImplementation(async () => void (signedInWhenSaved = h.state.signedIn));
    expect(await confirmSignUp('n@example.test', '123456')).toEqual({ ok: true });
    expect(h.saveSettings).toHaveBeenCalledWith({ onboarded: false });
    expect(signedInWhenSaved).toBe(false);
    expect(h.state.signedIn).toBe(true);
  });

  it('leaves the device alone when it holds another account', async () => {
    h.state = { ...EMPTY_STATE, userId: 'A' };
    expect(await confirmSignUp('n@example.test', '123456')).toEqual({ ok: false, otherAccount: true });
    expect(h.saveSettings).not.toHaveBeenCalled();
  });

  it('does not open the welcome when signing in to an account she already has', async () => {
    h.signInWithPassword.mockResolvedValue({ data: { user: { id: 'N' } }, error: null });
    await signIn('n@example.test', 'password1');
    expect(h.saveSettings).not.toHaveBeenCalled();
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

  // Offline with an expired access token, Supabase cannot renew it and returns no session, with a
  // network error. That is not a sign-out: studying offline goes on, and the next sync renews it.
  it('stays signed in when the session cannot be renewed offline', async () => {
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true };
    h.sessionError = { name: 'AuthRetryableFetchError', message: 'Failed to fetch' };
    await syncNow();
    expect(h.state.signedIn).toBe(true);
    expect(h.pull).not.toHaveBeenCalled();
  });

  it('turns signed out when the session is gone', async () => {
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true };
    await syncNow();
    expect(h.state.signedIn).toBe(false);
  });

  it('starts over from the beginning after a restore', async () => {
    h.session = { user: { id: 'A', email: 'a@example.test' } };
    h.state = { ...EMPTY_STATE, userId: 'A', signedIn: true, pulledAt: '2026-11-01T00:00:00.000Z', pulledId: 'x', pushedAt: '2026-11-01T00:00:00.000Z' };
    await syncNow({ full: true });
    expect(h.pull).toHaveBeenCalledWith({ at: EMPTY_STATE.pulledAt, id: '' }, 1000);
  });
});
