import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { downloadText } from '../../ui/clipboard';
import { useDemoCount, useMeta, useSettings } from '../../db/hooks';
import { clearDemoData, loadDemoData, protectStorage, saveSettings } from '../../db/repo';
import { checkBackup, deviceCounts, eraseDevice, exportBackup, restoreBackup, type Counts } from '../../db/backup';
import { db } from '../../db/db';
import { parsePasted } from '../../domain/validate';
import type { Backup, Settings as S } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';
import { DateField } from '../../ui/DateField';
import { fmtDate, isoDay } from '../../domain/dates';
import { ProfileEditor } from './ProfileEditor';
import { AccountSection } from './AccountSection';
import { SubjectsEditor } from './SubjectsEditor';
import { EMPTY_STATE, requestSync, syncAvailable, type SyncState } from '../../sync/trigger';
import { ThemeControl } from '../../ui/ThemeControl';
import { SETTINGS_PAGES } from '../../app/nav';
import { AsyncButton } from '../../ui/AsyncButton';
import { Icon } from '../../ui/Icon';
import { SignOutButton } from './SignOutButton';


export function Settings() {
  const { section } = useParams();
  const page = SETTINGS_PAGES.find((x) => x.id === section);
  const s = useSettings();
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);
  const [protectedStore, setProtected] = useState<boolean | null>(null);
  const [restore, setRestore] = useState<{ backup: Backup; incoming: Counts; device: Counts } | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; questions?: boolean } | null>(null);
  // What erasing would remove, shown in the confirmation. Null while it is closed.
  const [erase, setErase] = useState<Counts | null>(null);
  const [attempts, setAttempts] = useState(0);
  const demo = useDemoCount();
  const sync = useMeta<SyncState>('sync', EMPTY_STATE);
  const restoreInput = useRef<HTMLInputElement>(null);
  const announce = useAnnounce();
  // A link elsewhere ("Set your exam date") names the control it came for.
  const focus = (useLocation().state as { focus?: string } | null)?.focus;
  const loaded = !!s;

  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtected);
    db.attempts.count().then(setAttempts);
  }, []);

  // Runs after Page has focused the heading, so the named control wins.
  useEffect(() => {
    if (!loaded || !focus) return;
    const el = document.getElementById(focus);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  }, [loaded, focus]);

  if (!s) return <Page title={page?.label ?? 'Settings'}>{null}</Page>;
  // No page named: the list of them (the phone's Settings tab; the sidebar lists them on wide screens).
  if (!page)
    return (
      <Page title="Settings">
        <section className="tile" aria-label="Appearance">
          <ThemeControl />
        </section>
        <ul className="list">
          {SETTINGS_PAGES.map((x) => (
            <li key={x.id}>
              <Link className="list-link settings-row" to={`/settings/${x.id}`}>
                <span className="stack-sm">
                  <span className="settings-row-name">{x.label}</span>
                  <span className="meta">{x.line}</span>
                </span>
                <Icon name="caret" size={16} />
              </Link>
            </li>
          ))}
        </ul>
        {/* Phones: Sign out under the list. Wide screens have it at the foot of the side menu. */}
        {syncAvailable && <SignOutButton className={`${btn.secondary} settings-signout only-narrow`} />}
      </Page>
    );
  const show = (id: string) => page.id === id;

  const doExport = async () => {
    const { filename, text } = await exportBackup();
    const file = new File([text], filename, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'LET Prep backup' });
        announce('Backup ready to save');
        return;
      }
    } catch {
      /* share sheet closed: fall back to a download */
    }
    downloadText(filename, text);
    announce('Backup saved to your downloads');
  };

  const pickRestore = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    setRestoreMsg(null);
    if (!f) return;
    const parsed = parsePasted(await f.text());
    if (parsed.kind === 'questions')
      return setRestoreMsg({ text: 'This is a question list, not a backup.', questions: true });
    if (parsed.kind !== 'backup') return setRestoreMsg({ text: 'This file is not a backup made by this app. Nothing was restored.' });
    const r = checkBackup(parsed.value);
    if (!r.ok) return setRestoreMsg({ text: r.error });
    setRestore({ backup: r.backup, incoming: r.counts, device: await deviceCounts() });
  };

  const since = lastBackup ? attempts - lastBackup.attempts : attempts;

  return (
    <Page title={page.label} crumbs={[{ to: '/settings', label: 'Settings' }]}>
      <div className="stack">
        {show('subjects') && <SubjectsEditor s={s} />}
        {show('profile') && (
          <section className="tile" aria-label="Name and avatar">
            <ProfileEditor s={s} />
          </section>
        )}

        {show('exam') && (
        <section className="tile span-3">
          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-level">Level</label>
              <Select id="s-level" value={s.level} onChange={(v) => saveSettings({ level: v as S['level'] })}>
                <option value="elementary">Elementary</option>
                <option value="secondary">Secondary</option>
              </Select>
              <span className="meta">{s.level === 'secondary' ? 'Adds your major as a third part.' : 'Pick Secondary if you take a major.'}</span>
            </div>
            {s.level === 'secondary' && (
              <div className="field">
                <label htmlFor="s-major">Major</label>
                <input id="s-major" type="text" placeholder="e.g. Filipino" value={s.major} onChange={(e) => saveSettings({ major: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label htmlFor="s-date">Target exam date</label>
              <DateField id="s-date" value={s.examDate} min={isoDay(new Date())} onChange={(examDate) => saveSettings({ examDate })} />
            </div>
            <div className="field">
              <label htmlFor="s-timer">Mock exam timer</label>
              <Select id="s-timer" value={s.timer} onChange={(v) => saveSettings({ timer: v as S['timer'] })}>
                <option value="real">Real LET time</option>
                <option value="1.5">1.5× time</option>
                <option value="2">2× time</option>
                <option value="off">Off</option>
              </Select>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.strictSheet} onChange={(e) => saveSettings({ strictSheet: e.target.checked })} />
            Strict answer sheet: in digital mocks, answer on the bubble sheet only
          </label>
          <label className="check">
            <input type="checkbox" checked={s.oneAtATime} onChange={(e) => saveSettings({ oneAtATime: e.target.checked })} />
            One question at a time: in digital mocks, show one item per screen
          </label>
        </section>
        )}


        {show('account') && syncAvailable && <AccountSection />}

        {show('data') && (
        <>
        <section className="tile span-3" aria-labelledby="set-backup">
          <h2 id="set-backup">Backup</h2>
          <p className="muted">
            {lastBackup
              ? `Last backup ${fmtDate(lastBackup.at)}. ${since} answer${since === 1 ? '' : 's'} since then.`
              : sync?.signedIn
                ? 'No backup file yet. Your account keeps a copy online; a file is a second one.'
                : 'No backup yet. Your progress lives only on this device.'}
          </p>
          <div className="row">
            <button id="s-export" type="button" className={btn.primary} onClick={doExport}>
              Export backup
            </button>
            <button type="button" className={btn.secondary} onClick={() => restoreInput.current?.click()}>
              Restore backup
            </button>
            <input ref={restoreInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={pickRestore} aria-label="Backup file" />
          </div>
          {restoreMsg && (
            <p role="alert">
              {restoreMsg.text} {restoreMsg.questions && <Link to="/quizzes/new">Make a quiz from it instead.</Link>}
            </p>
          )}
          <div className="spread">
            <p className="meta">
              <span className="label">
                Storage: {protectedStore === null ? 'checking…' : protectedStore ? 'protected' : 'not protected'}
              </span>
              . The browser {protectedStore ? 'will not' : 'may'} clear it when space runs low.
            </p>
            {protectedStore === false && (
              <AsyncButton className={btn.secondary} onClick={async () => setProtected(await protectStorage())}>
                Protect storage
              </AsyncButton>
            )}
          </div>
        </section>

        <section className="tile span-3" aria-labelledby="set-demo">
          <h2 id="set-demo">Sample data</h2>
          <p className="muted">
            {demo
              ? `${demo} sample answers are mixed into your stats. Remove them before you study for real.`
              : 'Six weeks of made-up answers, to see Stats and the streak full. Your own answers are not touched.'}
          </p>
          <div className="row">
            {demo ? (
              <AsyncButton
                className={btn.secondary}
                onClick={async () => {
                  await clearDemoData();
                  announce('Sample answers removed');
                }}
              >
                Remove sample answers
              </AsyncButton>
            ) : (
              <AsyncButton className={btn.secondary} onClick={async () => announce(`Added ${await loadDemoData()} sample answers`)}>
                Add sample answers
              </AsyncButton>
            )}
          </div>
        </section>

        <section className="tile span-3" aria-labelledby="set-erase">
          <h2 id="set-erase">Erase this device</h2>
          <p className="muted">
            Removes every quiz, answer, mock exam, subject and setting on this device. Your name, avatar, level and major stay
            {sync?.signedIn ? ', and so does your sign-in' : ''}. Export a backup first if you might want them back.
          </p>
          <div>
            <AsyncButton className={btn.secondary} onClick={async () => setErase(await deviceCounts())}>
              Erase everything on this device
            </AsyncButton>
          </div>
        </section>
        </>
        )}
      </div>

      <Dialog open={!!erase} onClose={() => setErase(null)} title="Erase everything on this device?">
        {erase && (
          <>
            <p>
              This removes <span className="num">{erase.questions}</span> question{erase.questions === 1 ? '' : 's'},{' '}
              <span className="num">{erase.attempts}</span> answer{erase.attempts === 1 ? '' : 's'},
              your mock exams, subjects and settings from this device. It cannot be undone.
            </p>
            <p>Your name, avatar, level and major stay{sync?.signedIn ? ', and you stay signed in. The copy in your account is not touched' : ''}.</p>
            <div className="row">
              <button type="button" className={btn.primary} data-autofocus onClick={() => setErase(null)}>
                Keep my data
              </button>
              <AsyncButton
                className={btn.secondary}
                onClick={async () => {
                  await eraseDevice();
                  // Start again on an empty Study, with nothing in memory from before.
                  window.location.replace(window.location.pathname);
                }}
              >
                Erase everything
              </AsyncButton>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={!!restore} onClose={() => setRestore(null)} title="Replace everything on this device?">
        {restore && (
          <>
            <p>
              The backup from {fmtDate(restore.backup.exportedAt)} has <span className="num">{restore.incoming.questions}</span> questions
              and <span className="num">{restore.incoming.attempts}</span> answers.
            </p>
            <p>
              This device now has <span className="num">{restore.device.questions}</span> questions and{' '}
              <span className="num">{restore.device.attempts}</span> answers. They will be replaced.
            </p>
            <div className="row">
              <button type="button" className={btn.primary} data-autofocus onClick={() => setRestore(null)}>
                Cancel
              </button>
              <AsyncButton
                className={btn.secondary}
                onClick={async () => {
                  await restoreBackup(restore.backup);
                  // The restored records are old by date but may be new to the account: sync from the start.
                  requestSync({ full: true });
                  setRestore(null);
                  announce('Backup restored');
                }}
              >
                Replace with backup
              </AsyncButton>
            </div>
          </>
        )}
      </Dialog>
    </Page>
  );
}
