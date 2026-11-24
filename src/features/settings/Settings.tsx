import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { copyText, downloadText } from '../../ui/clipboard';
import { useDemoCount, useMeta, useSettings } from '../../db/hooks';
import { clearDemoData, loadDemoData, protectStorage, saveSettings } from '../../db/repo';
import { checkBackup, deviceCounts, exportBackup, restoreBackup, type Counts } from '../../db/backup';
import { db } from '../../db/db';
import { parsePasted } from '../../domain/validate';
import { SCHEMA_VERSION, type Backup, type Settings as S } from '../../domain/types';
import { version } from '../../../package.json';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';
import { DateField } from '../../ui/DateField';
import { ProfileEditor } from './ProfileEditor';
import { Avatar } from '../../ui/Avatar';
import { AccountSection } from './AccountSection';
import { EMPTY_STATE, requestSync, syncAvailable, type SyncState } from '../../sync/trigger';
import { SETTINGS_PAGES } from '../../app/nav';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function Settings() {
  const { section } = useParams();
  const page = SETTINGS_PAGES.find((x) => x.id === section);
  const s = useSettings();
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);
  const [protectedStore, setProtected] = useState<boolean | null>(null);
  const [restore, setRestore] = useState<{ backup: Backup; incoming: Counts; device: Counts } | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; questions?: boolean } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const demo = useDemoCount();
  const sync = useMeta<SyncState>('sync', EMPTY_STATE);
  const restoreInput = useRef<HTMLInputElement>(null);
  const announce = useAnnounce();
  // A link elsewhere ("Set your exam date", "Back up now") names the control it came for.
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
        <ul className="list">
          {SETTINGS_PAGES.map((x) => (
            <li key={x.id}>
              <Link className="list-link" to={`/settings/${x.id}`}>
                <span className="stack-sm">
                  <span>{x.label}</span>
                  <span className="meta">{x.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Page>
    );
  const show = (id: string) => page.id === id;
  const set = (patch: Partial<S>) => saveSettings(patch);


  const doExport = async () => {
    const { filename, text } = await exportBackup();
    const file = new File([text], filename, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'LET Reviewer backup' });
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
    <Page title={page.label} back={{ to: '/settings', label: 'Settings' }}>
      <div className="stack">
        {show('profile') && (
          <section className="tile" aria-label="Name and avatar">
            <div className="row">
              <Avatar who={s} size={44} />
              <span>{s.name.trim() || 'No name yet'}</span>
            </div>
            <ProfileEditor s={s} />
          </section>
        )}

        {show('exam') && (
        <section className="tile span-3" aria-labelledby="set-exam">
          <h2 id="set-exam">Exam</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-level">Level</label>
              <Select id="s-level" value={s.level} onChange={(v) => set({ level: v as S['level'] })}>
                <option value="elementary">Elementary</option>
                <option value="secondary">Secondary</option>
              </Select>
            </div>
            {s.level === 'secondary' && (
              <div className="field">
                <label htmlFor="s-major">Major</label>
                <input id="s-major" type="text" value={s.major} onChange={(e) => set({ major: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label htmlFor="s-date">Target exam date</label>
              <DateField id="s-date" value={s.examDate} onChange={(examDate) => set({ examDate })} />
            </div>
            <div className="field">
              <label htmlFor="s-timer">Mock exam timer</label>
              <Select id="s-timer" value={s.timer} onChange={(v) => set({ timer: v as S['timer'] })}>
                <option value="real">Real LET time</option>
                <option value="1.5">1.5× time</option>
                <option value="2">2× time</option>
                <option value="off">Off</option>
              </Select>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.strictSheet} onChange={(e) => set({ strictSheet: e.target.checked })} />
            Strict answer sheet: in digital mocks, answer on the bubble sheet only
          </label>
          <label className="check">
            <input type="checkbox" checked={s.oneAtATime} onChange={(e) => set({ oneAtATime: e.target.checked })} />
            One question at a time: in digital mocks, show one item per screen
          </label>
        </section>
        )}

        {show('display') && (
        <section className="tile span-3" aria-labelledby="set-display">
          <h2 id="set-display">Text and keys</h2>
          <div className="field">
            <label htmlFor="s-size">Text size</label>
            <Select id="s-size" value={s.textSize} onChange={(v) => set({ textSize: Number(v) as S['textSize'] })}>
              <option value={100}>100%</option>
              <option value={115}>115%</option>
              <option value={130}>130%</option>
            </Select>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.shortcuts} onChange={(e) => set({ shortcuts: e.target.checked })} />
            Single-key shortcuts (A to D, 1 to 4, Enter, F)
          </label>
        </section>
        )}

        {show('account') && syncAvailable && <AccountSection />}

        {show('data') && (
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
              <button type="button" className={btn.secondary} onClick={async () => setProtected(await protectStorage())}>
                Protect storage
              </button>
            )}
          </div>
        </section>
        )}

        {show('data') && (
        <section className="tile span-3" aria-labelledby="set-demo">
          <h2 id="set-demo">Sample data</h2>
          <p className="muted">
            {demo
              ? `${demo} sample answers are mixed into your stats. Remove them before you study for real.`
              : 'Six weeks of made-up answers, to see Stats, the streak and Missed questions full. Your own answers are not touched.'}
          </p>
          <div className="row">
            {demo ? (
              <button
                type="button"
                className={btn.secondary}
                onClick={async () => {
                  await clearDemoData();
                  announce('Sample answers removed');
                }}
              >
                Remove sample answers
              </button>
            ) : (
              <button type="button" className={btn.secondary} onClick={async () => announce(`Added ${await loadDemoData()} sample answers`)}>
                Add sample answers
              </button>
            )}
          </div>
        </section>
        )}

        {show('about') && (
        <section className="tile span-3" aria-labelledby="set-about">
          <h2 id="set-about">About</h2>
          <p className="muted num">
            Version {version}, data format v{SCHEMA_VERSION}
          </p>
          <div className="row">
            <button
              type="button"
              className={btn.quiet}
              onClick={async () => {
                const c = await deviceCounts();
                await copyText(
                  `LET Reviewer ${version}, data v${SCHEMA_VERSION}\nQuestions: ${c.questions}, answers: ${c.attempts}\nLast backup: ${lastBackup?.at ?? 'never'}\nStorage protected: ${protectedStore}\n${navigator.userAgent}`,
                );
                announce('Debug info copied');
              }}
            >
              Copy debug info
            </button>
            {import.meta.env.DEV && (
              <Link className={btn.quiet} to="/states">
                Visual states
              </Link>
            )}
          </div>
        </section>
        )}
      </div>

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
              <button
                type="button"
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
              </button>
            </div>
          </>
        )}
      </Dialog>
    </Page>
  );
}
