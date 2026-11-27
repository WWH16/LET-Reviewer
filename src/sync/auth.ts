// Accounts: create, confirm, sign in, reset, sign out, delete, and the one entry point for a sync.
// Every email carries a 6-digit code typed into the app, never a link: the app uses hash routes,
// which is also where a Supabase redirect link would put its tokens.

import type { Field } from '../domain/account';
import { saveSettings } from '../db/repo';
import { remote, supabase } from './client';
import { runSync } from './run';
import { dexieStore as store } from './store';
import { EMPTY_STATE, EPOCH } from './trigger';

export type AuthResult = { ok: true } | { ok: false; error: string; field?: Field };
export type SignInResult = AuthResult | { ok: false; needsCode: true } | { ok: false; otherAccount: true };

type Failure = { message?: string; code?: string; status?: number; name?: string };

/** Each Supabase error code: its message, and the form field it belongs to (none: the whole form). */
const ERRORS = new Map<string, [string, Field?]>([
  ['invalid_credentials', ['Wrong email or password.', 'password']],
  ['user_already_exists', ['This email already has an account. Sign in instead.', 'email']],
  ['email_exists', ['This email already has an account. Sign in instead.', 'email']],
  ['otp_expired', ['That code is wrong or has expired. Send a new one.', 'code']],
  ['over_email_send_rate_limit', ['Too many emails sent. Try again in a few minutes.']],
  ['over_request_rate_limit', ['Too many tries. Wait a minute, then try again.']],
  ['weak_password', ['Use 8 characters or more.', 'password']],
  ['same_password', ['That is your current password. Choose a different one.', 'password']],
  ['email_address_invalid', ['That email address does not look right.', 'email']],
  ['validation_failed', ['Check the email address and try again.', 'email']],
  ['email_address_not_authorized', ['The app cannot send email to this address yet. Try again later.', 'email']],
  ['signup_disabled', ['Creating accounts is turned off right now.']],
]);
const isOffline = (e: Failure) => e.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed/i.test(e.message ?? '');

/** An account error in words the person can act on. */
export function messageFor(error: Failure): string {
  const known = error.code && ERRORS.get(error.code);
  if (known) return known[0];
  // A request that never got an answer is "offline" only when the device says so; online, the service is the
  // one out of reach (down, paused, or a wrong project address).
  if (isOffline(error) && globalThis.navigator?.onLine === false) return 'You are offline. Try again when you are connected.';
  return 'Could not reach the account service. Try again.';
}
const fail = (error: Failure): AuthResult => {
  const field = error.code ? ERRORS.get(error.code)?.[1] : undefined;
  return field ? { ok: false, error: messageFor(error), field } : { ok: false, error: messageFor(error) };
};

/**
 * After any successful sign-in: this device's data must belong to this account, or to no one yet. A new account
 * (`fresh`) starts at the welcome, so she sets her name, avatar, level and major first, with whatever this device
 * already had filled in. It is turned on before she counts as signed in, so the app never shows before it.
 */
async function finishSignIn(userId: string | undefined, { fresh = false } = {}): Promise<SignInResult> {
  if (!userId) return fail({});
  const state = await store.getState();
  // The session stays, so Replace can go ahead; nothing syncs until the person decides.
  if (state.userId && state.userId !== userId) return { ok: false, otherAccount: true };
  if (fresh) await saveSettings({ onboarded: false });
  await store.setState({ signedIn: true, lastError: null });
  void syncNow();
  return { ok: true };
}

/** Sends the confirmation code. The account is usable after `confirmSignUp`. */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return fail(error);
  // For an email that is already registered Supabase answers with a look-alike user that has no identities.
  if (data.user && data.user.identities?.length === 0) return fail({ code: 'user_already_exists' });
  return { ok: true };
}

export async function confirmSignUp(email: string, code: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
  return error ? fail(error) : finishSignIn(data.user?.id, { fresh: true });
}

export async function resendCode(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return error ? fail(error) : { ok: true };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === 'email_not_confirmed') {
    const sent = await resendCode(email);
    return sent.ok ? { ok: false, needsCode: true } : sent;
  }
  return error ? fail(error) : finishSignIn(data.user?.id);
}

/** Sends the reset code. `finishReset` takes it with the new password. */
export async function requestReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return error ? fail(error) : { ok: true };
}

export async function finishReset(email: string, code: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' });
  if (error) return fail(error);
  const changed = await supabase.auth.updateUser({ password });
  return changed.error ? fail(changed.error) : finishSignIn(data.user?.id);
}

/** After `otherAccount`: this device's data is replaced by the signed-in account's. */
export async function replaceDeviceData(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await store.clear();
  await store.setState({ ...EMPTY_STATE, userId, signedIn: true });
  await syncNow();
}

/** Data stays on the device, and so does whose it is, so a different account is noticed later. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
  await store.setState({ signedIn: false, lastError: null });
}

/** Removes the account and its online copy. The device keeps its data, now belonging to no account. */
export async function deleteAccount(password: string): Promise<AuthResult> {
  // The password first, checked against the signed-in email, so a phone left signed in cannot delete the account.
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return { ok: false, error: 'Sign in again, then try once more.' };
  const check = await supabase.auth.signInWithPassword({ email, password });
  if (check.error?.code === 'invalid_credentials') return { ok: false, error: 'That password is not right.', field: 'password' };
  if (check.error) return fail(check.error);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return fail(error);
  await supabase.auth.signOut({ scope: 'local' });
  await store.setState({ ...EMPTY_STATE });
  return { ok: true };
}

export async function currentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

let running: Promise<void> | null = null;

/**
 * One sync, if signed in. Calls made while one runs share it. Never throws.
 * `full` starts both cursors over, for after a backup restore.
 */
export function syncNow(opts: { full?: boolean } = {}): Promise<void> {
  // A restore must not be swallowed by a run already under way: wait for it, then start over.
  if (opts.full && running) return running.then(() => syncNow(opts));
  running ??= (async () => {
    try {
      const state = await store.getState();
      if (!state.signedIn) return;
      const { data, error } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        // Offline after the access token expired (about an hour): Supabase could not renew it, but the session is
        // still stored. Stay signed in so studying goes on; a sync once the network is back renews it.
        if (error && isOffline(error)) return;
        return void (await store.setState({ signedIn: false }));
      }
      if (opts.full) await store.setState({ pulledAt: EPOCH, pulledId: '', pushedAt: EPOCH });
      if (await runSync(remote, store, userId)) return;
      // A failed run is either no network (try again later) or a session the server no longer accepts.
      const check = await supabase.auth.getUser();
      if (check.error && !isOffline(check.error)) {
        await supabase.auth.signOut({ scope: 'local' });
        await store.setState({ signedIn: false });
      }
    } catch {
      /* a sync never interrupts studying; the next trigger tries again */
    } finally {
      running = null;
    }
  })();
  return running;
}
