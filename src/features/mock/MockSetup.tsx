import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip } from '../../ui/Chip';
import { useAnnounce } from '../../ui/Status';
import { useExams, useQuestions, useSettings } from '../../db/hooks';
import { nowIso, saveExam, uuid } from '../../db/repo';
import { PARTS, partsFor, timeLimit } from '../../domain/let-config';
import { SOURCE_LABELS, drawExam, gradable, matchesSource, type SourceFilter } from '../../domain/examDraw';
import { examLabel } from '../../domain/ids';
import type { Area, MockExam, PaperSize } from '../../domain/types';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';

type Length = 'full' | 'half' | 'short';
const SHORT = 25;

const lengthOf = (area: Area, l: Length) => (l === 'full' ? PARTS[area].items : l === 'half' ? Math.round(PARTS[area].items / 2) : SHORT);

const STATUS_TEXT: Record<MockExam['status'], string> = { 'in-progress': 'In progress', printed: 'Printed, not graded', graded: 'Graded' };

export function examLink(e: MockExam) {
  if (e.status === 'graded') return `/mock/${e.id}/results`;
  if (e.form === 'printed') return `/mock/${e.id}/print`;
  return `/mock/${e.id}`;
}

export function MockSetup() {
  const questions = useQuestions();
  const exams = useExams();
  const settings = useSettings();
  const [form, setForm] = useState<'digital' | 'printed'>('digital');
  const [picked, setPart] = useState<Area | null>(null);
  const [length, setLength] = useState<Length>('full');
  const [source, setSource] = useState<SourceFilter>('rc');
  const [paper, setPaper] = useState<NonNullable<MockExam['paper']>>({ size: 'folio', columns: 2, large: false, answerKey: true });
  const navigate = useNavigate();
  const announce = useAnnounce();

  if (!questions || !exams || !settings) return <Page title="Mock exam">{null}</Page>;

  const part = picked ?? partsFor(settings.level)[0];
  const n = lengthOf(part, length);
  const inPart = questions.filter((q) => gradable(q) && q.area === part);
  const pool = inPart.filter((q) => matchesSource(q, source));
  const rc = inPart.filter((q) => q.source === 'review-center').length;
  const ai = inPart.length - rc;
  const enough = pool.length >= n;
  const limit = timeLimit(part, settings.timer, n);

  const start = async () => {
    const r = drawExam(pool, PARTS[part], n);
    if (!r.ok) return;
    const now = new Date();
    const exam: MockExam = {
      id: uuid(),
      label: examLabel(part, now, exams.map((e) => e.label)),
      form,
      part,
      itemIds: r.itemIds,
      timeLimitMin: form === 'digital' ? limit : PARTS[part].minutes * (n / PARTS[part].items),
      paper: form === 'printed' ? paper : null,
      answers: {},
      answeredAt: {},
      flags: [],
      drawNote: r.note,
      status: form === 'digital' ? 'in-progress' : 'printed',
      createdAt: nowIso(),
      elapsedMs: 0,
      submittedAt: null,
      totalMin: null,
      updatedAt: nowIso(),
      deleted: false,
    };
    await saveExam(exam);
    if (r.note) announce(r.note);
    navigate(examLink(exam));
  };

  const open = exams.filter((e) => e.status !== 'graded');
  const done = exams.filter((e) => e.status === 'graded').slice(0, 10);

  return (
    <Page title="Mock exam">
      {open.length > 0 && (
        <section className="stack-sm" aria-labelledby="mk-open">
          <h2 id="mk-open">Not finished</h2>
          <ul className="list">
            {open.map((e) => (
              <li key={e.id} className="spread">
                <span className="stack-sm">
                  <span className="mono">{e.label}</span>
                  <span className="meta">
                    {PARTS[e.part].name}, {e.itemIds.length} items. {STATUS_TEXT[e.status]}
                  </span>
                </span>
                <span className="row">
                  {e.form === 'printed' ? (
                    <>
                      <Link className={btn.secondary} to={`/mock/${e.id}/print`}>
                        Print
                      </Link>
                      <Link className={btn.primary} to={`/mock/${e.id}/entry`}>
                        Enter answers
                      </Link>
                    </>
                  ) : (
                    <Link className={btn.primary} to={`/mock/${e.id}`}>
                      Continue
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (enough) start();
        }}
      >
        <h2>New exam</h2>
        <p className="muted">Answers are graded only after you submit, like the paper LET.</p>

        <fieldset className="stack-sm">
          <legend className="label">Form</legend>
          <label className="check">
            <input type="radio" name="form" checked={form === 'digital'} onChange={() => setForm('digital')} />
            Digital paper: booklet and bubble sheet on screen
          </label>
          <label className="check">
            <input type="radio" name="form" checked={form === 'printed'} onChange={() => setForm('printed')} />
            Printed paper: print it, answer with a pencil, enter answers after
          </label>
        </fieldset>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="mk-part">Part</label>
            <Select id="mk-part" value={part} onChange={(v) => setPart(v as Area)}>
              {partsFor(settings.level).map((a) => (
                <option key={a} value={a}>
                  {PARTS[a].name}
                </option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="mk-len">Length</label>
            <Select id="mk-len" value={length} onChange={(v) => setLength(v as Length)}>
              <option value="full">Full: {PARTS[part].items} items</option>
              <option value="half">Half: {Math.round(PARTS[part].items / 2)} items</option>
              <option value="short">Short: {SHORT} items</option>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="mk-src">Questions</label>
            <Select id="mk-src" value={source} onChange={(v) => setSource(v as SourceFilter)}>
              {(Object.keys(SOURCE_LABELS) as SourceFilter[]).map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {form === 'printed' && (
          <fieldset className="stack-sm">
            <legend className="label">Paper</legend>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="mk-size">Paper size</label>
                <Select id="mk-size" value={paper.size} onChange={(v) => setPaper({ ...paper, size: v as PaperSize })}>
                  <option value="folio">Folio 8.5×13 (long bond)</option>
                  <option value="letter">Letter (short bond)</option>
                  <option value="a4">A4</option>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="mk-cols">Booklet columns</label>
                <Select id="mk-cols" value={paper.columns} onChange={(v) => setPaper({ ...paper, columns: Number(v) as 1 | 2 })}>
                  <option value={2}>2 columns (saves paper)</option>
                  <option value={1}>1 column</option>
                </Select>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={paper.large} onChange={(e) => setPaper({ ...paper, large: e.target.checked })} />
              Large print (14 pt)
            </label>
            <label className="check">
              <input type="checkbox" checked={paper.answerKey} onChange={(e) => setPaper({ ...paper, answerKey: e.target.checked })} />
              Add an answer key page, to fold away
            </label>
          </fieldset>
        )}

        <div role="status" className={enough ? undefined : 'notice'}>
          {enough ? (
            <p>
              {n} items from {pool.length} available.{' '}
              {form === 'digital' && (limit === null ? 'Timer off.' : `${limit} minutes.`)}
            </p>
          ) : (
            <div className="stack-sm">
              <p>
                {length === 'full' ? 'A full' : length === 'half' ? 'A half-length' : 'A short'} {PARTS[part].name} mock needs {n} questions.
                You have {rc} from the review center{ai > 0 ? ` and ${ai} AI` : ''}.
              </p>
              <div className="row">
                {length === 'full' && pool.length >= lengthOf(part, 'half') && (
                  <button type="button" className={btn.secondary} onClick={() => setLength('half')}>
                    Use half length
                  </button>
                )}
                {length !== 'short' && pool.length >= SHORT && (
                  <button type="button" className={btn.secondary} onClick={() => setLength('short')}>
                    Use {SHORT} items
                  </button>
                )}
                {source !== 'all' && inPart.length > pool.length && (
                  <button type="button" className={btn.secondary} onClick={() => setSource('all')}>
                    Include AI questions
                  </button>
                )}
                {inPart.length < SHORT && (
                  <Link className={btn.secondary} to="/bank/import">
                    Import more questions
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <button type="submit" className={btn.primary} disabled={!enough}>
            {form === 'digital' ? 'Start exam' : 'Make printable exam'}
          </button>
        </div>
      </form>

      {done.length > 0 && (
        <section className="stack-sm" aria-labelledby="mk-done">
          <h2 id="mk-done">Past exams</h2>
          <ul className="list">
            {done.map((e) => (
              <li key={e.id}>
                <Link className="list-link spread" to={`/mock/${e.id}/results`}>
                  <span className="mono">{e.label}</span>
                  <span className="row">
                    <Chip>{e.form === 'digital' ? 'Digital' : 'Printed'}</Chip>
                    <span className="meta">{PARTS[e.part].name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
