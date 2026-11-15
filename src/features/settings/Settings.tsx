import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { useAnnounce } from '../../ui/Status';
import { copyText, downloadText } from '../../ui/clipboard';
import { useMeta, useSettings } from '../../db/hooks';
import { protectStorage, saveSettings } from '../../db/repo';
import { checkBackup, deviceCounts, exportBackup, restoreBackup, type Counts } from '../../db/backup';
import { db } from '../../db/db';
import { parsePasted } from '../../domain/validate';
import { SCHEMA_VERSION, type Backup, type Settings as S } from '../../domain/types';
import { version } from '../../../package.json';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function Settings() {
  const s = useSettings();
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);
  const [protectedStore, setProtected] = useState<boolean | null>(null);
  const [restore, setRestore] = useState<{ backup: Backup; incoming: Counts; device: Counts } | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ text: string; questions?: boolean } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const restoreInput = useRef<HTMLInputElement>(null);
  const announce = useAnnounce();

  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtected);
    db.attempts.count().then(setAttempts);
  }, []);

  if (!s) return <Page title="Settings">{null}</Page>;
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
    <Page title="Settings">
      <section className="stack" aria-labelledby="set-exam">
        <h2 id="set-exam">Exam</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="s-level">Level</label>
            <select id="s-level" value={s.level} onChange={(e) => set({ level: e.target.value as S['level'] })}>
              <option value="elementary">Elementary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>
          {s.level === 'secondary' && (
            <div className="field">
              <label htmlFor="s-major">Major</label>
              <input id="s-major" type="text" value={s.major} onChange={(e) => set({ major: e.target.value })} />
            </div>
          )}
          <div className="field">
            <label htmlFor="s-date">Target exam date</label>
            <input id="s-date" type="date" value={s.examDate ?? ''} onChange={(e) => set({ examDate: e.target.value || null })} />
          </div>
          <div className="field">
            <label htmlFor="s-timer">Mock exam timer</label>
            <select id="s-timer" value={s.timer} onChange={(e) => set({ timer: e.target.value as S['timer'] })}>
              <option value="real">Real LET time</option>
              <option value="1.5">1.5× time</option>
              <option value="2">2× time</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.strictSheet} onChange={(e) => set({ strictSheet: e.target.checked })} />
          Strict answer sheet: in digital mocks, answer on the bubble sheet only
        </label>
      </section>

      <hr />

      <section className="stack" aria-labelledby="set-display">
        <h2 id="set-display">Display and keys</h2>
        <fieldset className="stack-sm">
          <legend className="label">Theme</legend>
          <div className="row">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <label key={t} className="check" style={{ marginRight: 'var(--s4)' }}>
                <input type="radio" name="theme" checked={s.theme === t} onChange={() => set({ theme: t })} />
                {t[0].toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="s-size">Text size</label>
          <select id="s-size" value={s.textSize} onChange={(e) => set({ textSize: Number(e.target.value) as S['textSize'] })}>
            <option value={100}>100%</option>
            <option value={115}>115%</option>
            <option value={130}>130%</option>
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.shortcuts} onChange={(e) => set({ shortcuts: e.target.checked })} />
          Single-key shortcuts (A–D, 1–4, Enter, F)
        </label>
      </section>

      <hr />

      <section className="stack" aria-labelledby="set-backup">
        <h2 id="set-backup">Backup</h2>
        <p className="muted">
          {lastBackup
            ? `Last backup ${fmtDate(lastBackup.at)}. ${since} answer${since === 1 ? '' : 's'} since then.`
            : 'No backup yet. Your progress lives only on this device.'}
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={doExport}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => restoreInput.current?.click()}>
            Restore backup
          </button>
          <input ref={restoreInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={pickRestore} aria-label="Backup file" />
        </div>
        {restoreMsg && (
          <p role="alert">
            {restoreMsg.text} {restoreMsg.questions && <Link to="/bank/import">Import it from Bank instead.</Link>}
          </p>
        )}
        <div className="spread">
          <span>
            Storage: {protectedStore === null ? 'checking…' : protectedStore ? 'protected' : 'not protected'}
            <span className="muted"> · the browser {protectedStore ? 'will not' : 'may'} clear it when space runs low</span>
          </span>
          {protectedStore === false && (
            <button type="button" className="btn" onClick={async () => setProtected(await protectStorage())}>
              Protect storage
            </button>
          )}
        </div>
        <p className="muted">Cloud backup and sync between devices: not set up yet.</p>
      </section>

      <hr />

      <section className="stack-sm" aria-labelledby="set-about">
        <h2 id="set-about">About</h2>
        <p className="muted num">
          Version {version} · data format v{SCHEMA_VERSION}
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn-quiet"
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
          <Link className="btn btn-quiet" to="/states">
            Visual states
          </Link>
        </div>
      </section>

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
              <button type="button" className="btn btn-primary" data-autofocus onClick={() => setRestore(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await restoreBackup(restore.backup);
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
