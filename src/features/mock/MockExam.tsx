import { memo, useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Stem } from '../../ui/Stem';
import { BubbleGrid } from '../../ui/BubbleGrid';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { useExam, useExamQuestions, useSettings } from '../../db/hooks';
import { answerExam, gradeExam, saveSettings, toggleExamFlag, updateExam } from '../../db/repo';
import { formatClock } from '../../domain/dates';
import { PARTS } from '../../domain/let-config';
import type { Key, MockExam as Exam, Question } from '../../domain/types';
import { btn } from '../../ui/btn';

const MILESTONES = [30, 10, 5, 1];

/**
 * The exam clock. It owns the per-second state so the 150-item booklet does not re-render
 * every second. Time only runs while the page is visible, and is saved every 5 seconds.
 * The display is silent to screen readers; a separate region speaks at 30, 10, 5, 1 minutes (a11y C3).
 */
function Clock({
  exam,
  elapsed,
  onTimeUp,
}: {
  exam: Exam;
  elapsed: MutableRefObject<number>;
  onTimeUp: () => void;
}) {
  const [ms, setMs] = useState(elapsed.current);
  const [milestone, setMilestone] = useState('');
  const limit = exam.timeLimitMin === null ? null : exam.timeLimitMin * 60000;
  const spoken = useRef(new Set(MILESTONES.filter((m) => limit !== null && limit - elapsed.current <= m * 60000)));
  const fired = useRef(false);
  // Kept in a ref: the callback changes on every save, and restarting the clock on each
  // change would save again on cleanup and loop.
  const timeUp = useRef(onTimeUp);
  timeUp.current = onTimeUp;

  useEffect(() => {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === 'visible') elapsed.current += now - last;
      last = now;
      setMs(elapsed.current);
      if (limit === null) return;
      const left = limit - elapsed.current;
      for (const m of MILESTONES) {
        if (left <= m * 60000 && !spoken.current.has(m)) {
          spoken.current.add(m);
          setMilestone(`${m} minute${m === 1 ? '' : 's'} remaining`);
        }
      }
      if (left <= 0 && !fired.current) {
        fired.current = true;
        timeUp.current();
      }
    };
    const save = () => updateExam(exam.id, { elapsedMs: Math.round(elapsed.current) });
    const onVis = () => {
      tick();
      if (document.visibilityState === 'hidden') save();
    };
    const t = setInterval(tick, 1000);
    const s = setInterval(save, 5000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(t);
      clearInterval(s);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [exam.id, limit, elapsed]);

  return (
    <>
      <span role="timer" aria-live="off" aria-label={limit === null ? 'Time used' : 'Time remaining'} className="timer">
        <Icon name="clock" size={14} /> {formatClock(limit === null ? ms : limit - ms)}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {milestone}
      </span>
    </>
  );
}

const Item = memo(function Item({
  n,
  q,
  value,
  flagged,
  strict,
  onAnswer,
  onFlag,
}: {
  n: number;
  q: Question;
  value: Key | null;
  flagged: boolean;
  strict: boolean;
  onAnswer: (n: number, k: Key) => void;
  onFlag: (n: number) => void;
}) {
  return (
    <section className="item stack-sm" id={`item-${n}`} aria-labelledby={`item-h-${n}`}>
      <div className="spread">
        <h2 id={`item-h-${n}`} tabIndex={-1}>
          <span className="sr-only">Item </span>
          {n}
          {flagged && <span className="sr-only">, flagged</span>}
        </h2>
        <button
          type="button"
          className={btn.quiet}
          aria-pressed={flagged}
          aria-label={`Flag item ${n}`}
          onClick={() => onFlag(n)}
          style={{ textDecoration: 'none' }}
        >
          <Icon name="flag" /> {flagged ? 'Flagged' : 'Flag'}
        </button>
      </div>
      <Stem id={`item-s-${n}`} lang={q.lang} text={q.stem} />
      {q.media && <p className="notice">Figure: {q.media.alt}</p>}
      {strict ? (
        <ol className="plain-choices" lang={q.lang}>
          {q.choices.map((c) => (
            <li key={c.key}>
              {c.key}. {c.text}
            </li>
          ))}
        </ol>
      ) : (
        <ChoiceGroup
          name={`m-${n}`}
          labelledBy={`item-s-${n}`}
          lang={q.lang}
          choices={q.choices}
          value={value}
          onChange={(k) => onAnswer(n, k as Key)}
        />
      )}
    </section>
  );
});

export function MockExam() {
  const { id } = useParams();
  const exam = useExam(id);
  const qmap = useExamQuestions(exam);
  const settings = useSettings();
  const navigate = useNavigate();
  const elapsed = useRef<number | null>(null);
  const cursor = useRef(0);
  const [confirm, setConfirm] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetToggle = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number } | null>(null);
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetToggle.current?.focus();
  }, []);
  // Close the phone sheet with Escape, and with Android's back gesture where CloseWatcher exists,
  // so back closes the sheet instead of leaving the exam.
  useEffect(() => {
    if (!sheetOpen) return;
    const CW = (window as unknown as { CloseWatcher?: new () => { onclose: (() => void) | null; destroy(): void } }).CloseWatcher;
    if (CW) {
      const w = new CW();
      w.onclose = closeSheet;
      return () => w.destroy();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      closeSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen, closeSheet]);
  // Swipe down on the grab handle to dismiss the sheet: it follows the finger, and closes past 80 px or on a quick flick.
  const grab = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      drag.current = { y: e.clientY, t: e.timeStamp };
      e.currentTarget.setPointerCapture(e.pointerId);
      if (sheetRef.current) sheetRef.current.style.transition = 'none';
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag.current || !sheetRef.current) return;
      sheetRef.current.style.transform = `translateY(${Math.max(0, e.clientY - drag.current.y)}px)`;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag.current || !sheetRef.current) return;
      const dy = e.clientY - drag.current.y;
      const speed = dy / Math.max(1, e.timeStamp - drag.current.t);
      drag.current = null;
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
      if (dy > 80 || speed > 0.5) closeSheet();
    },
    onPointerCancel: () => {
      drag.current = null;
      if (sheetRef.current) {
        sheetRef.current.style.transition = '';
        sheetRef.current.style.transform = '';
      }
    },
  };
  const [restored, setRestored] = useState<string | null>(null);
  // One-at-a-time view: the item on screen. Until she moves, it is the first item with no answer.
  const [picked, setAt] = useState<number | null>(null);
  const submitting = useRef(false);

  // The clock reads this on its first render, so it is set here and not in an effect.
  if (exam && elapsed.current === null) elapsed.current = exam.elapsedMs;

  // Runs once, when the exam first loads: later saves keep the same id.
  useEffect(() => {
    if (!exam) return;
    const answered = Object.keys(exam.answers).length;
    if (exam.elapsedMs > 0 || answered > 0)
      setRestored(`Exam ${exam.label} restored: ${answered} of ${exam.itemIds.length} answered. The timer was paused while the app was closed.`);
  }, [exam?.id]);

  const onAnswer = useCallback(
    (n: number, k: Key | null) => {
      cursor.current = n;
      if (id) answerExam(id, n, k, Math.round(elapsed.current ?? 0));
    },
    [id],
  );
  const onFlag = useCallback(
    (n: number) => {
      cursor.current = n;
      if (id) toggleExamFlag(id, n);
    },
    [id],
  );

  const submit = useCallback(
    async (timeUp: boolean) => {
      if (!exam || submitting.current) return;
      submitting.current = true;
      await updateExam(exam.id, { elapsedMs: Math.round(elapsed.current ?? 0) });
      const fresh = { ...exam, elapsedMs: Math.round(elapsed.current ?? 0) };
      await gradeExam(fresh);
      navigate(`/mock/${exam.id}/results`, { state: { timeUp } });
    },
    [exam, navigate],
  );
  const onTimeUp = useCallback(() => submit(true), [submit]);

  if (exam === undefined || !qmap || !settings) return <Page title="Mock exam">{null}</Page>;
  if (!exam || exam.deleted)
    return (
      <Page title="Exam not found">
        <Link to="/mock">Back to Mock</Link>
      </Page>
    );
  if (exam.status === 'graded' && !submitting.current) return <Navigate to={`/mock/${exam.id}/results`} replace />;
  if (exam.form === 'printed') return <Navigate to={`/mock/${exam.id}/print`} replace />;

  const total = exam.itemIds.length;
  const answered = Object.keys(exam.answers).length;
  const unanswered = total - answered;

  const one = settings.oneAtATime;
  const firstOpen = exam.itemIds.findIndex((_, i) => !(String(i + 1) in exam.answers));
  const at = Math.min(total, picked ?? (firstOpen === -1 ? total : firstOpen + 1));
  const goTo = (n: number) => {
    setSheetOpen(false);
    cursor.current = n;
    // The item must be on the page before it can take focus.
    if (one) flushSync(() => setAt(n));
    const h = document.getElementById(`item-h-${n}`);
    h?.scrollIntoView({ block: 'start' });
    h?.focus({ preventScroll: true });
  };
  const nextWhere = (test: (n: number) => boolean) => {
    for (let k = 1; k <= total; k++) {
      const n = ((cursor.current + k - 1) % total) + 1;
      if (test(n)) return goTo(n);
    }
  };

  const sheet = (
    <BubbleGrid
      label="Answer sheet"
      count={total}
      answers={exam.answers}
      flags={exam.flags}
      current={one ? at : undefined}
      onSelect={onAnswer}
    />
  );

  const jumps = (
    <>
      <button type="button" className={btn.secondary} onClick={() => nextWhere((n) => exam.answers[String(n)] === undefined)} disabled={!unanswered}>
        Next unanswered
      </button>
      <button type="button" className={btn.secondary} onClick={() => nextWhere((n) => exam.flags.includes(n))} disabled={!exam.flags.length}>
        Next flagged
      </button>
      <button type="button" className={btn.secondary} aria-pressed={one} onClick={() => saveSettings({ oneAtATime: !one })}>
        One at a time
      </button>
    </>
  );

  return (
    <Page title={`${exam.label}, ${PARTS[exam.part].name}`} wide>
      {/* One row on a phone: time, the answer sheet (with the count), Submit. Jumps live in the sheet there. */}
      <div className="exam-bar no-print">
        <Clock exam={exam} elapsed={elapsed as MutableRefObject<number>} onTimeUp={onTimeUp} />
        <span className="label only-wide">
          <span className="num">{answered}</span>/<span className="num">{total}</span> answered
        </span>
        <button
          ref={sheetToggle}
          type="button"
          className={`${btn.secondary} only-narrow`}
          aria-expanded={sheetOpen}
          aria-controls="answer-sheet"
          aria-label={`Answer sheet, ${answered} of ${total} answered`}
          onClick={() => setSheetOpen((o) => !o)}
        >
          <Icon name="mock" />
          <span className="num">
            {answered}/{total}
          </span>
        </button>
        <span className="exam-bar-actions">
          <span className="row only-wide">{jumps}</span>
          <button type="button" className={btn.primary} onClick={() => setConfirm(true)}>
            Submit
          </button>
        </span>
      </div>

      {restored && (
        <p className="notice spread">
          <span>{restored}</span>
          <button type="button" className={btn.quiet} onClick={() => setRestored(null)}>
            Dismiss
          </button>
        </p>
      )}
      {settings.strictSheet && <p className="muted">Strict sheet is on: shade your answers on the answer sheet.</p>}

      <div className="exam">
        <div className="booklet">
          {(one ? [exam.itemIds[at - 1]] : exam.itemIds).map((qid, i) => {
            const q = qmap.get(qid);
            const n = one ? at : i + 1;
            return q ? (
              <Item
                key={qid}
                n={n}
                q={q}
                value={exam.answers[String(n)] ?? null}
                flagged={exam.flags.includes(n)}
                strict={settings.strictSheet}
                onAnswer={onAnswer}
                onFlag={onFlag}
              />
            ) : (
              <section className="item" key={qid}>
                <h2>{n}</h2>
                <p className="muted">This question was removed from the bank.</p>
              </section>
            );
          })}
          {one && (
            <div className="spread item-nav">
              <button type="button" className={btn.secondary} disabled={at <= 1} onClick={() => goTo(at - 1)}>
                Previous
              </button>
              <span className="label">
                Item <span className="num">{at}</span> of <span className="num">{total}</span>
              </span>
              <button type="button" className={btn.primary} disabled={at >= total} onClick={() => goTo(at + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
        <aside
          ref={sheetRef}
          id="answer-sheet"
          className={`sheet stack-sm ${sheetOpen ? 'sheet-drawer' : 'only-wide'}`}
          aria-label="Answer sheet"
        >
          {sheetOpen && <div className="sheet-grab" aria-hidden="true" {...grab} />}
          <div className="spread">
            <span className="label">Answer sheet</span>
            {sheetOpen && (
              <button type="button" className={btn.quiet} onClick={closeSheet}>
                Close
              </button>
            )}
          </div>
          {sheetOpen && <div className="row only-narrow">{jumps}</div>}
          {sheet}
        </aside>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Submit exam? ${unanswered} unanswered, ${exam.flags.length} flagged`}>
        <p className="muted">After submitting, answers are graded and can no longer change.</p>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={() => setConfirm(false)}>
            Keep answering
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              setConfirm(false);
              submit(false);
            }}
          >
            Submit now
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
