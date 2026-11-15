import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { BubbleGrid } from '../../ui/BubbleGrid';
import { Dialog } from '../../ui/Dialog';
import { useExam, useSettings } from '../../db/hooks';
import { answerExam, gradeExam, updateExam } from '../../db/repo';
import { KEYS, type Key } from '../../domain/types';

/**
 * Tap entry for a printed sheet (plan §8.3). Each tap fills the current row and moves on,
 * so 150 items take about five minutes. "Blank" records an item left unshaded (DX R6).
 */
export function MockEntry() {
  const { id } = useParams();
  const exam = useExam(id);
  const settings = useSettings();
  const navigate = useNavigate();
  const [current, setCurrent] = useState<number | null>(null);
  const [minutes, setMinutes] = useState('');
  const [confirm, setConfirm] = useState(false);
  const counter = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!exam || current !== null) return;
    const firstOpen = exam.itemIds.findIndex((_, i) => !(String(i + 1) in exam.answers));
    setCurrent(firstOpen === -1 ? exam.itemIds.length : firstOpen + 1);
    if (exam.totalMin !== null) setMinutes(String(exam.totalMin));
  }, [exam, current]);

  const total = exam?.itemIds.length ?? 0;
  const set = (n: number, key: Key | null) => {
    if (!exam) return;
    answerExam(exam.id, n, key);
    setCurrent(Math.min(total, n + 1));
  };

  useEffect(() => {
    if (!settings?.shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.matches('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || current === null) return;
      if (document.querySelector('dialog[open]')) return;
      const k = e.key.toUpperCase();
      if ((KEYS as readonly string[]).includes(k)) set(current, k as Key);
      else if (e.key === ' ' && t.tagName !== 'BUTTON') set(current, null);
      else if (e.key === 'Backspace') setCurrent(Math.max(1, current - 1));
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!exam || !settings || current === null) return <Page title="Enter answers">{null}</Page>;
  if (exam.status === 'graded') return <Navigate to={`/mock/${exam.id}/results`} replace />;

  const entered = Object.keys(exam.answers).length;
  const blank = Object.values(exam.answers).filter((v) => v === null).length;
  const missing = exam.itemIds.map((_, i) => i + 1).filter((n) => !(String(n) in exam.answers));
  const value = exam.answers[String(current)];

  const grade = async () => {
    const m = Number(minutes);
    await updateExam(exam.id, { totalMin: minutes && m > 0 ? Math.round(m) : null });
    await gradeExam({ ...exam, answers: Object.fromEntries(exam.itemIds.map((_, i) => [String(i + 1), exam.answers[String(i + 1)] ?? null])) });
    navigate(`/mock/${exam.id}/results`);
  };

  return (
    <Page title={`Enter answers · ${exam.label}`}>
      <p className="muted">Tap what is shaded on the sheet. It moves to the next item by itself.</p>

      <section className="stack" aria-labelledby="entry-now">
        <div className="spread">
          <h2 id="entry-now">
            Item <span className="num">{current}</span> of <span className="num">{total}</span>
          </h2>
          <p ref={counter} className="label" role="status">
            {entered} entered · {blank} blank
          </p>
        </div>
        <div className="entry-pad" role="group" aria-label={`Answer for item ${current}`}>
          {[...KEYS, null].map((k) => (
            <button
              key={k ?? 'blank'}
              type="button"
              className={k ? 'bubble' : 'bubble bubble-blank'}
              aria-pressed={k ? value === k : value === null}
              onClick={() => set(current, k)}
            >
              {k ?? 'Blank'}
            </button>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
            Back
          </button>
          <button type="button" className="btn" disabled={current >= total} onClick={() => setCurrent(current + 1)}>
            Skip
          </button>
          {settings.shortcuts && <span className="muted">Keys: A–D shade · Space blank · Backspace back</span>}
        </div>
      </section>

      <details>
        <summary className="label">Whole sheet</summary>
        <div style={{ marginTop: 'var(--s4)' }}>
          <BubbleGrid
            label="Entered answers"
            count={total}
            answers={exam.answers}
            current={current}
            withBlank
            onSelect={(n, k) => set(n, k as Key | null)}
          />
        </div>
      </details>

      <div className="stack">
        <div className="field" style={{ maxWidth: '14rem' }}>
          <label htmlFor="entry-min">Total time you took (minutes)</label>
          <input id="entry-min" type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => setConfirm(true)}>
            Grade exam
          </button>
          <Link className="btn btn-quiet" to={`/mock/${exam.id}/print`}>
            Back to print
          </Link>
        </div>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Grade exam? ${entered} entered, ${blank} blank`}>
        {missing.length > 0 && (
          <p>
            {missing.length === 1 ? `Item ${missing[0]} has` : `${missing.length} items have`} nothing entered and will count as blank
            {missing.length <= 10 ? `: ${missing.join(', ')}` : ''}.
          </p>
        )}
        <div className="row">
          <button type="button" className="btn btn-primary" data-autofocus onClick={() => setConfirm(false)}>
            Keep entering
          </button>
          <button type="button" className="btn" onClick={grade}>
            Grade now
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
