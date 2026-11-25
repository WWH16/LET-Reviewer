import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { useMeta } from '../../db/hooks';
import { btn } from '../../ui/btn';
import { EMPTY_STATE, type SyncState } from '../../sync/trigger';

// The account code (and Supabase with it) loads when this section first needs it, not with the app.
const auth = () => import('../../sync/auth');
type Step = 'form' | 'confirm' | 'reset';
type Outcome = { ok: true } | { ok: false; error?: string; needsCode?: true; otherAccount?: true };

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Signing in, creating an account, and the account once signed in. The app opens on it (`required`) until
 * she signs in, then it lives in Settings, Account.
 */
export function AccountSection({ required }: { required?: boolean } = {}) {
  const sync = useMeta<SyncState>('sync', EMPTY_STATE);
  const announce = useAnnounce();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const signedIn = !!sync?.signedIn;

  useEffect(() => {
    if (signedIn) auth().then((a) => a.currentEmail()).then(setSignedInAs);
  }, [signedIn]);

  if (!sync) return null;

  /** Runs one account call: one at a time, with its error shown in the form. */
  const run = async (call: (a: Awaited<ReturnType<typeof auth>>) => Promise<Outcome>, done: (r: Outcome) => void) => {
    setBusy(true);
    setError('');
    try {
      const r = await call(await auth());
      if (!r.ok && r.error) setError(r.error);
      else done(r);
    } catch {
      setError('Could not reach the account service. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const afterSignIn = (r: Outcome) => {
    if (r.ok) {
      setStep('form');
      setPassword('');
      setCode('');
      announce('Signed in');
    } else if (r.needsCode) {
      setStep('confirm');
    } else if (r.otherAccount) {
      setOther(true);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'form') run((a) => a.signIn(email, password), afterSignIn);
    else if (step === 'confirm') run((a) => a.confirmSignUp(email, code), afterSignIn);
    else run((a) => a.finishReset(email, code, password), afterSignIn);
  };
  const formOk = (e: { currentTarget: HTMLButtonElement }) => e.currentTarget.form?.reportValidity() ?? false;

  return (
    <section className="tile span-3">

      {signedIn ? (
        <>
          <div className="stack-sm">
            <p>{signedInAs ?? 'Signed in'}</p>
            <p className="meta" role="status">
              {sync.lastError
                ? 'Could not sync. It will try again when you are online.'
                : sync.lastSyncAt
                  ? `Last synced ${when(sync.lastSyncAt)}.`
                  : 'Syncing for the first time.'}
            </p>
          </div>
          <div className="row">
            <button
              type="button"
              className={btn.secondary}
              aria-busy={busy}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await (await auth()).syncNow();
                setBusy(false);
                announce('Synced');
              }}
            >
              Sync now
            </button>
            <button
              type="button"
              className={btn.quiet}
              onClick={async () => {
                await (await auth()).signOut();
                announce('Signed out');
              }}
            >
              Sign out
            </button>
            <button type="button" className={btn.quiet} onClick={() => setDeleting(true)}>
              Delete account
            </button>
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={submit} noValidate={false}>
          <p className="muted">
            {step === 'form'
              ? required
                ? 'Sign in, or create an account, to start. Your quizzes and answers stay the same on every device.'
                : 'Sign in to keep your questions and answers on all your devices.'
              : step === 'confirm'
                ? `Enter the 6-digit code sent to ${email}.`
                : `Enter the 6-digit code sent to ${email}, and a new password.`}
          </p>

          {step === 'form' && (
            <div className="field">
              <label htmlFor="acc-email">Email</label>
              <input id="acc-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} />
            </div>
          )}
          {step !== 'form' && (
            <div className="field">
              <label htmlFor="acc-code">Code</label>
              <input
                id="acc-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
          {step !== 'confirm' && (
            <div className="field">
              <label htmlFor="acc-password">{step === 'reset' ? 'New password' : 'Password'}</label>
              <input
                id="acc-password"
                type="password"
                autoComplete={step === 'reset' ? 'new-password' : 'current-password'}
                minLength={8}
                required
                aria-describedby="acc-password-help"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span id="acc-password-help" className="meta">
                8 characters or more.
              </span>
            </div>
          )}

          {error && <p role="alert">{error}</p>}

          <div className="row">
            <button type="submit" className={btn.primary} disabled={busy} aria-busy={busy}>
              {step === 'form' ? 'Sign in' : step === 'confirm' ? 'Confirm' : 'Save password'}
            </button>
            {step === 'form' && (
              <>
                <button
                  type="button"
                  className={btn.secondary}
                  disabled={busy}
                  onClick={(e) => formOk(e) && run((a) => a.signUp(email, password), () => (setCode(''), setStep('confirm')))}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className={btn.quiet}
                  disabled={busy}
                  onClick={() => {
                    const field = document.getElementById('acc-email') as HTMLInputElement;
                    if (!field.reportValidity()) return;
                    run((a) => a.requestReset(email), () => (setCode(''), setPassword(''), setStep('reset')));
                  }}
                >
                  Forgot password?
                </button>
              </>
            )}
            {step === 'confirm' && (
              <button type="button" className={btn.quiet} disabled={busy} onClick={() => run((a) => a.resendCode(email), () => announce('New code sent'))}>
                Send a new code
              </button>
            )}
            {step !== 'form' && (
              <button type="button" className={btn.quiet} onClick={() => (setError(''), setStep('form'))}>
                Back
              </button>
            )}
          </div>
          <p className="meta">What is stored: your questions, answers, mock exams and settings. Only you can read them.</p>
        </form>
      )}

      <Dialog
        open={other}
        onClose={async () => {
          setOther(false);
          await (await auth()).signOut();
        }}
        title="This device has another account’s data"
      >
        <p>Replace it with the data from {email}, or cancel and stay signed out.</p>
        <div className="row">
          <button
            type="button"
            className={btn.primary}
            data-autofocus
            onClick={async () => {
              setOther(false);
              await (await auth()).signOut();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              setOther(false);
              await (await auth()).replaceDeviceData();
              setPassword('');
              announce('Signed in');
            }}
          >
            Replace data on this device
          </button>
        </div>
      </Dialog>

      <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <p>This removes the copy stored online. The data on this device stays.</p>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={() => setDeleting(false)}>
            Keep my account
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              setDeleting(false);
              const r = await (await auth()).deleteAccount();
              if (r.ok) announce('Account deleted');
              else setError(r.error);
            }}
          >
            Delete account
          </button>
        </div>
      </Dialog>
    </section>
  );
}
