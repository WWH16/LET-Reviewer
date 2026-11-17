import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { BubbleGrid } from '../../ui/BubbleGrid';
import { Dialog } from '../../ui/Dialog';
import { useExam, useSettings } from '../../db/hooks';
import { answerExam, gradeExam, updateExam } from '../../db/repo';
import { MAX_SCAN_ITEMS, readSheet } from '../../domain/sheet';
import { KEYS, type Key } from '../../domain/types';
import { btn } from '../../ui/btn';
import { requestSync } from '../../sync/trigger';

/**
 * Tap entry for a printed sheet (plan §8.3). Each tap fills the current row and moves on,
 * so 150 items take about five minutes. "Blank" records an item left unshaded (DX R6).
 */
export function MockEntry() {
  const { id } = useParams();
  const exam = useExam(id);
  const settings = useSettings();
  const navigate = useNavigate();
  const [picked, setCurrent] = useState<number | null>(null);
  const [typedMinutes, setMinutes] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const counter = useRef<HTMLParagraphElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const total = exam?.itemIds.length ?? 0;
  // Opens on the first item with nothing entered. Every tap sets `picked`, so this only places the start.
  const firstOpen = exam ? exam.itemIds.findIndex((_, i) => !(String(i + 1) in exam.answers)) : -1;
  const current = picked ?? (exam ? (firstOpen === -1 ? total : firstOpen + 1) : null);
  const minutes = typedMinutes ?? (exam && exam.totalMin !== null ? String(exam.totalMin) : '');
  const set = (n: number, key: Key | null) => {
    if (!exam) return;
    answerExam(exam.id, n, key);
    setCurrent(Math.min(total, n + 1));
  };

  // An effect event reads the latest item and exam, so the listener is attached once, not on every render.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.matches('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || current === null) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.toUpperCase();
    if ((KEYS as readonly string[]).includes(k)) set(current, k as Key);
    else if (e.key === ' ' && t.tagName !== 'BUTTON') set(current, null);
    else if (e.key === 'Backspace') setCurrent(Math.max(1, current - 1));
    else return;
    e.preventDefault();
  });
  const shortcuts = settings?.shortcuts;
  useEffect(() => {
    if (!shortcuts) return;
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcuts]);

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
    requestSync();
    navigate(`/mock/${exam.id}/results`);
  };

  /** Reads a photo of the answer sheet into the entry grid. She still checks it and presses Grade. */
  const scan = async (photo: File) => {
    let read: ReturnType<typeof readSheet> = { ok: false };
    try {
      const bmp = await createImageBitmap(photo);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      read = readSheet(ctx.getImageData(0, 0, canvas.width, canvas.height), total);
    } catch {
      // Not an image the browser can open: same message as an unreadable photo.
    }
    if (!read.ok) return setScanMsg('Could not read the sheet. Retake the photo with all five black squares in view, the paper flat, and no shadow across it.');
    await updateExam(exam.id, { answers: read.answers });
    setCurrent(read.unclear[0] ?? total);
    const marked = Object.values(read.answers).filter((v) => v !== null).length;
    setScanMsg(
      `Read ${marked} answers. ` +
        (read.unclear.length
          ? `Could not tell ${read.unclear.length === 1 ? 'item' : 'items'} ${read.unclear.join(', ')}: enter ${read.unclear.length === 1 ? 'it' : 'them'} by hand.`
          : 'Check a few against the paper, then grade.'),
    );
  };

  return (
    <Page title={`Enter answers for ${exam.label}`} back={{ to: '/mock', label: 'Mock exam' }}>
      <p className="muted">Scan the sheet, or tap what is shaded on it. Tapping moves to the next item by itself.</p>
      {total <= MAX_SCAN_ITEMS && (
        <div className="stack-sm">
          <div>
            <button type="button" className={btn.secondary} onClick={() => file.current?.click()}>
              Scan answer sheet
            </button>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) scan(f);
              }}
            />
          </div>
          <p role="status" className={scanMsg ? 'notice' : undefined}>
            {scanMsg}
          </p>
        </div>
      )}

      <section className="stack" aria-labelledby="entry-now">
        <div className="spread">
          <h2 id="entry-now">
            Item <span className="num">{current}</span> of <span className="num">{total}</span>
          </h2>
          <p ref={counter} className="label" role="status">
            {entered} entered, {blank} blank
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
          <button type="button" className={btn.secondary} disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
            Back
          </button>
          <button type="button" className={btn.secondary} disabled={current >= total} onClick={() => setCurrent(current + 1)}>
            Skip
          </button>
          {settings.shortcuts && <span className="muted label">
              <kbd>A</kbd> to <kbd>D</kbd> shade. <kbd>Space</kbd> marks blank. <kbd>Backspace</kbd> goes back.
            </span>}
        </div>
      </section>

      <details>
        <summary className="label">Whole sheet</summary>
        <div style={{ marginTop: 'var(--space-md)' }}>
          <BubbleGrid
            label="Entered answers"
            count={total}
            answers={exam.answers}
            current={current}
            withBlank
            onSelect={set}
          />
        </div>
      </details>

      <div className="stack">
        <div className="field" style={{ maxWidth: '14rem' }}>
          <label htmlFor="entry-min">Total time you took (minutes)</label>
          <input id="entry-min" type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="row">
          <button type="button" className={btn.primary} onClick={() => setConfirm(true)}>
            Grade exam
          </button>
          <Link className={btn.quiet} to={`/mock/${exam.id}/print`}>
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
          <button type="button" className={btn.primary} data-autofocus onClick={() => setConfirm(false)}>
            Keep entering
          </button>
          <button type="button" className={btn.secondary} onClick={grade}>
            Grade now
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
