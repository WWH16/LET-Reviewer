import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { useMeta } from '../../db/hooks';
import { btn } from '../../ui/btn';
import { Icon } from '../../ui/Icon';
import { EMPTY_STATE, type SyncState } from '../../sync/trigger';
import { checkAccountFields, type Field } from '../../domain/account';

// The account code (and Supabase with it) loads when this section first needs it, not with the app.
const auth = () => import('../../sync/auth');
type Step = 'form' | 'confirm' | 'reset';
/** On the form step: signing in to an account, or creating one. */
type Mode = 'in' | 'up';
type Outcome = { ok: true } | { ok: false; error?: string; field?: Field; needsCode?: true; otherAccount?: true };
/** Errors on show: each under its own field, or `form` for one that belongs to no field (the service, the network). */
type Errors = Partial<Record<Field | 'form', string>>;
const INPUT: Record<Field, string> = { email: 'acc-email', password: 'acc-password', code: 'acc-code' };

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
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const run = async (call: (a: Awaited<ReturnType<typeof auth>>) => Promise<Outcome>, done: (r: Outcome) => void) => {
    setBusy(true);
    setErrors({});
    try {
      const r = await call(await auth());
      if (!r.ok && r.error) show({ [r.field ?? 'form']: r.error });
      else done(r);
    } catch {
      show({ form: 'Could not reach the account service. Try again.' });
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
    const found = checkAccountFields({
      email: step === 'form' ? email : undefined,
      password: step !== 'confirm' ? password : undefined,
      code: step !== 'form' ? code : undefined,
    });
    if (show(found)) return;
    if (step === 'form' && mode === 'up') run((a) => a.signUp(email, password), () => (setCode(''), setStep('confirm')));
    else if (step === 'form') run((a) => a.signIn(email, password), afterSignIn);
    else if (step === 'confirm') run((a) => a.confirmSignUp(email, code), afterSignIn);
    else run((a) => a.finishReset(email, code, password), afterSignIn);
  };
  const pick = (m: Mode) => (setMode(m), setErrors({}));

  return (
    <section className={required ? 'tile auth-card' : 'tile span-3'}>

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
              <button type="button" aria-pressed={mode === 'in'} disabled={busy} onClick={() => pick('in')}>
                Sign in
              </button>
              <button type="button" aria-pressed={mode === 'up'} disabled={busy} onClick={() => pick('up')}>
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
              />
              <FieldError input="acc-email" text={errors.email} />
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
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'acc-code-error' : undefined}
                value={code}
                onChange={(e) => (setCode(e.target.value.replace(/\D/g, '')), edited('code'))}
              />
              <FieldError input="acc-code" text={errors.code} />
            </div>
          )}
          {step !== 'confirm' && (
            <div className="field">
              <label htmlFor="acc-password">{step === 'reset' ? 'New password' : 'Password'}</label>
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
                  aria-controls="acc-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
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

          <button type="submit" className={`${btn.primary} auth-submit`} disabled={busy} aria-busy={busy}>
            {step === 'form' ? (mode === 'up' ? 'Create account' : 'Sign in') : step === 'confirm' ? 'Confirm' : 'Save password'}
          </button>
          <div className="row">
            {step === 'form' && mode === 'in' && (
              <button
                type="button"
                className={btn.quiet}
                disabled={busy}
                onClick={() => {
                  if (show(checkAccountFields({ email }))) return;
                  run((a) => a.requestReset(email), () => (setCode(''), setPassword(''), setStep('reset')));
                }}
              >
                Forgot password?
              </button>
            )}
            {step === 'confirm' && (
              <button type="button" className={btn.quiet} disabled={busy} onClick={() => run((a) => a.resendCode(email), () => announce('New code sent'))}>
                Send a new code
              </button>
            )}
            {step !== 'form' && (
              <button type="button" className={btn.quiet} onClick={() => (setErrors({}), setStep('form'))}>
                Back
              </button>
            )}
          </div>
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
              else setErrors({ form: r.error });
            }}
          >
            Delete account
          </button>
        </div>
      </Dialog>
    </section>
  );
}
