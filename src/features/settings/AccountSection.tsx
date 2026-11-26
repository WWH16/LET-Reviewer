import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { useMeta } from '../../db/hooks';
import { btn } from '../../ui/btn';
import { Icon } from '../../ui/Icon';
import { EMPTY_STATE, type SyncState } from '../../sync/trigger';
import { checkAccountFields, type Field } from '../../domain/account';
import { AsyncButton } from '../../ui/AsyncButton';
import { SignOutButton } from './SignOutButton';

// The account code (and Supabase with it) loads when this section first needs it, not with the app.
const auth = () => import('../../sync/auth');
type Step = 'form' | 'confirm' | 'reset';
/** On the form step: signing in to an account, or creating one. */
type Mode = 'in' | 'up';
type Outcome = { ok: true } | { ok: false; error?: string; field?: Field; needsCode?: true; otherAccount?: true };
/** Errors on show: each under its own field, or `form` for one that belongs to no field (the service, the network). */
type Errors = Partial<Record<Field | 'form', string>>;
const INPUT: Record<Field, string> = { email: 'acc-email', password: 'acc-password', code: 'acc-code' };
/** The request under way, so only the button that started it shows the spinner; every button waits for it. */
type Busy = 'submit' | 'reset' | 'resend' | 'sync' | null;
const CODE_LENGTH = 6;

/** A field's error, under the field, tied to it with `aria-describedby` (`${input}-error`). */
function FieldError({ input, text }: { input: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={`${input}-error`} className="field-error">
      <Icon name="alert" size={16} />
      {text}
    </p>
  );
}

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
  const [mode, setMode] = useState<Mode>('in');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [other, setOther] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const closeDelete = () => (setDeleting(false), setDeletePassword(''), setDeleteError(''));
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const signedIn = !!sync?.signedIn;
  const heading = useRef<HTMLHeadingElement>(null);
  const title =
    step === 'confirm' ? 'Check your email' : step === 'reset' ? 'Set a new password' : mode === 'up' ? 'Create your account' : 'Sign in to LET Prep';

  // On the sign-in screen the heading names the step and the tab title follows it. Focus lands on it when the
  // step changes; a switch between Sign in and Create account leaves focus on the tab she pressed.
  useEffect(() => {
    if (!required) return;
    document.title = `${title} · LET Prep`;
  }, [required, title]);
  useEffect(() => {
    if (required) heading.current?.focus();
  }, [required, step]);

  // A switch slides the form in from the side of the tab picked (Create account from the right, Sign in from
  // the left), each part a beat after the one above; a new step slides in from the right. Transform and
  // opacity only, cancelled if she switches again mid-slide, and skipped under reduced motion.
  const form = useRef<HTMLFormElement>(null);
  const shown = useRef(`${mode}-${step}`);
  useEffect(() => {
    const now = `${mode}-${step}`;
    if (shown.current === now) return;
    shown.current = now;
    if (!form.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dx = step === 'form' && mode === 'in' ? -16 : 16;
    const parts = [...form.current.children].filter((el) => !el.classList.contains('seg'));
    const runs = parts.map((el, i) =>
      el.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], {
        duration: 240,
        delay: i * 35,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'backwards',
      }),
    );
    return () => runs.forEach((r) => r.cancel());
  }, [mode, step]);

  useEffect(() => {
    if (signedIn) auth().then((a) => a.currentEmail()).then(setSignedInAs);
  }, [signedIn]);

  if (!sync) return null;

  /**
   * Shows these errors and moves focus to the first field with one, so a screen reader reads its label and its
   * error together. Returns whether there were any.
   */
  const show = (found: Errors) => {
    setErrors(found);
    const first = (['email', 'code', 'password'] as const).find((f) => found[f]);
    if (first) requestAnimationFrame(() => document.getElementById(INPUT[first])?.focus());
    return Object.keys(found).length > 0;
  };
  /** A field drops its error as soon as she changes it. */
  const edited = (field: Field) => {
    if (errors[field]) setErrors(({ [field]: _, ...rest }) => rest);
  };

  /** Runs one account call: one at a time, with its error shown on its field, or for the whole form. */
  const run = async (kind: Busy, call: (a: Awaited<ReturnType<typeof auth>>) => Promise<Outcome>, done: (r: Outcome) => void) => {
    setBusy(kind);
    setErrors({});
    try {
      const r = await call(await auth());
      if (!r.ok && r.error) show({ [r.field ?? 'form']: r.error });
      else done(r);
    } catch {
      show({ form: 'Could not reach the account service. Try again.' });
    } finally {
      setBusy(null);
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
    if (busy) return; // Enter or a pasted code while a request runs must not send it again
    const found = checkAccountFields({
      email: step === 'form' ? email : undefined,
      password: step !== 'confirm' ? password : undefined,
      code: step !== 'form' ? code : undefined,
    });
    if (show(found)) return;
    if (step === 'form' && mode === 'up') run('submit', (a) => a.signUp(email, password), () => (setCode(''), setStep('confirm')));
    else if (step === 'form') run('submit', (a) => a.signIn(email, password), afterSignIn);
    else if (step === 'confirm') run('submit', (a) => a.confirmSignUp(email, code), afterSignIn);
    else run('submit', (a) => a.finishReset(email, code, password), afterSignIn);
  };
  const pick = (m: Mode) => (setMode(m), setErrors({}));

  return (
    // In Settings it is the same clay card as on the sign-in screen, so the account looks one way wherever it is.
    <section className={required ? 'tile auth-card' : 'tile span-3 auth-card'} aria-labelledby={signedIn ? 'acc-title' : undefined}>
      {signedIn ? (
        <>
          <div className="stack-sm">
            <h2 id="acc-title">Signed in</h2>
            <p className="auth-email">{signedInAs ?? 'Your account'}</p>
            <p className="meta" role="status">
              {sync.lastError
                ? 'Could not sync. It will try again later.'
                : sync.lastSyncAt
                  ? `Last synced ${when(sync.lastSyncAt)}.`
                  : 'Syncing for the first time.'}
            </p>
          </div>
          <div className="row auth-actions">
            <button
              type="button"
              className={btn.primary}
              aria-busy={busy === 'sync'}
              disabled={!!busy}
              onClick={async () => {
                setBusy('sync');
                await (await auth()).syncNow();
                setBusy(null);
                announce('Synced');
              }}
            >
              Sync now
            </button>
            <SignOutButton className={btn.secondary} />
            <button type="button" className={btn.quiet} onClick={() => setDeleting(true)}>
              Delete account
            </button>
          </div>
          {errors.form && (
            <p role="alert" className="form-error">
              <Icon name="alert" size={16} />
              {errors.form}
            </p>
          )}
        </>
      ) : (
        <form ref={form} className="stack" onSubmit={submit} noValidate>
          {required && (
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
          )}
          {step === 'form' && (
            <div className="seg" role="group" aria-label="Account">
              <button type="button" aria-pressed={mode === 'in'} disabled={!!busy} onClick={() => pick('in')}>
                Sign in
              </button>
              <button type="button" aria-pressed={mode === 'up'} disabled={!!busy} onClick={() => pick('up')}>
                Create account
              </button>
            </div>
          )}
          {(step !== 'form' || !required) && (
            <p className="muted">
              {step === 'form'
                ? 'Sign in to keep your questions and answers on all your devices.'
                : step === 'confirm'
                  ? `Enter the 6-digit code sent to ${email}.`
                  : `Enter the 6-digit code sent to ${email}, and a new password.`}
            </p>
          )}

          {step === 'form' && (
            <div className="field">
              <label htmlFor="acc-email">Email</label>
              <input
                id="acc-email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'acc-email-error' : undefined}
                value={email}
                onChange={(e) => (setEmail(e.target.value.trim()), edited('email'))}
                // Enter in Email with no password yet goes on to Password, as Tab would, instead of sending an
                // empty form. The Sign in button itself still checks both fields.
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || password) return;
                  e.preventDefault();
                  document.getElementById(INPUT.password)?.focus();
                }}
              />
              <FieldError input="acc-email" text={errors.email} />
            </div>
          )}
          {step !== 'form' && (
            <div className="field">
              <label htmlFor="acc-code">Code</label>
              {/* One real input, so paste, the phone's code autofill and screen readers all work as usual; the six
                  boxes over it only show the digits. Confirming sends itself once all six are in. */}
              <div className="otp">
                <input
                  id="acc-code"
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern={`[0-9]{${CODE_LENGTH}}`}
                  required
                  aria-invalid={!!errors.code}
                  aria-describedby={errors.code ? 'acc-code-error' : undefined}
                  value={code}
                  onChange={(e) => {
                    // No maxLength on the input: a pasted "036 182" keeps all six digits once the space goes.
                    const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
                    setCode(digits);
                    edited('code');
                    if (step === 'confirm' && !busy && digits.length === CODE_LENGTH && digits !== code) {
                      requestAnimationFrame(() => form.current?.requestSubmit());
                    }
                  }}
                />
                <div className="otp-boxes" aria-hidden="true">
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <span key={i} className={i === Math.min(code.length, CODE_LENGTH - 1) ? 'otp-box is-next' : 'otp-box'}>
                      {code[i] ?? ''}
                    </span>
                  ))}
                </div>
              </div>
              <FieldError input="acc-code" text={errors.code} />
            </div>
          )}
          {step !== 'confirm' && (
            <div className="field">
              <div className="field-head">
                <label htmlFor="acc-password">{step === 'reset' ? 'New password' : 'Password'}</label>
                {step === 'form' && mode === 'in' && (
                  <button
                    type="button"
                    className="text-btn"
                    disabled={!!busy}
                    aria-busy={busy === 'reset'}
                    onClick={() => {
                      if (show(checkAccountFields({ email }))) return;
                      run('reset', (a) => a.requestReset(email), () => (setCode(''), setPassword(''), setStep('reset')));
                    }}
                  >
                    {busy === 'reset' ? 'Sending code…' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="pw">
                <input
                  id="acc-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={step === 'reset' || mode === 'up' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'acc-password-error acc-password-help' : 'acc-password-help'}
                  value={password}
                  onChange={(e) => (setPassword(e.target.value), edited('password'))}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="acc-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {/* The eye matches the password: closed (lashes down) while it is hidden, open while it shows.
                      The label says what a press does next. */}
                  <Icon name={showPassword ? 'eye' : 'eye-closed'} size={20} />
                </button>
              </div>
              <FieldError input="acc-password" text={errors.password} />
              <span id="acc-password-help" className="meta">
                8 characters or more.
              </span>
            </div>
          )}

          {errors.form && (
            <p role="alert" className="form-error">
              <Icon name="alert" size={16} />
              {errors.form}
            </p>
          )}

          <button type="submit" className={`${btn.primary} auth-submit`} disabled={!!busy} aria-busy={busy === 'submit'}>
            {step === 'form' ? (mode === 'up' ? 'Create account' : 'Sign in') : step === 'confirm' ? 'Confirm' : 'Save password'}
          </button>
          {step !== 'form' && (
          <div className="row">
            {step === 'confirm' && (
              <button
                type="button"
                className={btn.quiet}
                disabled={!!busy}
                aria-busy={busy === 'resend'}
                onClick={() => run('resend', (a) => a.resendCode(email), () => announce('New code sent'))}
              >
                Send a new code
              </button>
            )}
            <button type="button" className={btn.quiet} onClick={() => (setErrors({}), setStep('form'))}>
              Back
            </button>
          </div>
          )}
          {!required && <p className="meta">What is stored: your questions, answers, mock exams and settings. Only you can read them.</p>}
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

      <Dialog open={deleting} onClose={closeDelete} title="Delete your account?">
        <p>
          This deletes your account and the copy of your questions and answers stored online. It cannot be undone.
          The data on this device stays.
        </p>
        <div className="field">
          <label htmlFor="acc-delete-password">Type your password to confirm</label>
          <input
            id="acc-delete-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!deleteError}
            aria-describedby={deleteError ? 'acc-delete-password-error' : undefined}
            value={deletePassword}
            onChange={(e) => (setDeletePassword(e.target.value), setDeleteError(''))}
          />
          <FieldError input="acc-delete-password" text={deleteError} />
        </div>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={closeDelete}>
            Keep my account
          </button>
          {/* Only with a password typed. The dialog stays open, the button turning, until the account is gone. */}
          <AsyncButton
            className={btn.secondary}
            disabled={!deletePassword}
            onClick={async () => {
              const r = await (await auth()).deleteAccount(deletePassword);
              if (r.ok) return closeDelete(), announce('Account deleted');
              if (r.field === 'password') {
                setDeleteError(r.error);
                document.getElementById('acc-delete-password')?.focus();
              } else closeDelete(), setErrors({ form: r.error });
            }}
          >
            Delete account
          </AsyncButton>
        </div>
      </Dialog>
    </section>
  );
}
