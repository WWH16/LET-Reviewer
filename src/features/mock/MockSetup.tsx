import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Chip } from '../../ui/Chip';
import { useExams, useQuestionMap, useSettings } from '../../db/hooks';
import { saveExam } from '../../db/repo';
import { PARTS, partsFor, timeLimit } from '../../domain/let-config';
import { drawMock, quotas } from '../../domain/examDraw';
import { counts } from '../../domain/quiz';
import { subjectsOf, subareaName } from '../../domain/subjects';
import type { Area, MockExam, PaperSize } from '../../domain/types';
import { examLink, newExam } from './newExam';
import { btn } from '../../ui/btn';
import { Select } from '../../ui/Select';
import { scoreTone } from '../../ui/Gauge';
import { examScore } from '../../domain/scoring';

type Length = 'full' | 'half' | 'short';
const SHORT = 25;

const lengthOf = (area: Area, l: Length) => (l === 'full' ? PARTS[area].items : l === 'half' ? Math.round(PARTS[area].items / 2) : SHORT);

const STATUS_TEXT: Record<MockExam['status'], string> = { 'in-progress': 'In progress', printed: 'Printed, not graded', graded: 'Graded' };


export function MockSetup() {
  const qmap = useQuestionMap();
  const exams = useExams();
  const settings = useSettings();
  const [form, setForm] = useState<'digital' | 'printed'>('digital');
  const [picked, setPart] = useState<Area | null>(null);
  // Null until she changes them: then every subject with questions is in.
  const [pickedSubjects, setSubjects] = useState<string[] | null>(null);
  const [length, setLength] = useState<Length>('short');
  // Minutes she sets for this mock, as typed. Empty follows the default: real LET time for its length (Settings, Exam).
  const [minutes, setMinutes] = useState('');
  const [paper, setPaper] = useState<NonNullable<MockExam['paper']>>({ size: 'folio', columns: 2, large: false, answerKey: true });
  const navigate = useNavigate();

  if (!qmap || !exams || !settings) return <Page title="Mock exams">{null}</Page>;

  const part = picked ?? partsFor(settings.level)[0];
  const pool = [...qmap.values()].filter((q) => counts(q) && q.area === part);
  const have = new Map<string, number>();
  for (const q of pool) have.set(q.subarea, (have.get(q.subarea) ?? 0) + 1);
  const all = subjectsOf(part, settings.subjects, pool);
  const subjects = pickedSubjects ?? all.filter((s) => have.has(s.id)).map((s) => s.id);
  const n = lengthOf(part, length);
  const need = quotas(subjects.length, n);
  const short = subjects.map((id, i) => ({ id, have: have.get(id) ?? 0, need: need[i] })).filter((x) => x.have < x.need);
  const ready = subjects.length > 0 && short.length === 0;
  const defaultLimit = timeLimit(part, settings.timer, n);
  // 0 turns the timer off; a blank field takes the default.
  const typed = minutes.trim() === '' ? null : Math.max(0, Math.round(Number(minutes)) || 0);
  const limit = typed === null ? defaultLimit : typed === 0 ? null : typed;
  // Kept in the part's own order, so the list and the draw read the same way.
  const toggle = (id: string) =>
    setSubjects(all.map((s) => s.id).filter((x) => (x === id ? !subjects.includes(id) : subjects.includes(x))));

  const start = async () => {
    const used = new Set(exams.flatMap((e) => e.itemIds));
    const itemIds = drawMock(pool, subjects, n, used);
    const exam = newExam({ part, form, itemIds, qmap, subjects, paper, settings, labels: exams.map((e) => e.label), timeLimitMin: limit });
    await saveExam(exam);
    navigate(examLink(exam));
  };

  const open = exams.filter((e) => e.status !== 'graded');
  const done = exams.filter((e) => e.status === 'graded').slice(0, 10);

  return (
    <Page title="Mock exams" wide={open.length > 0 || done.length > 0}>
      <div className="mock-layout">
        {open.length > 0 && (
          <section className="stack-sm" aria-labelledby="mk-open">
            <h2 id="mk-open">Unfinished</h2>
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
                        <Link className={btn.secondary} to={`/mock/${e.id}/entry`}>
                          Enter answers
                        </Link>
                      </>
                    ) : (
                      <Link className={btn.secondary} to={`/mock/${e.id}`}>
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
          className="tile"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) start();
          }}
        >
          <h2>New exam</h2>
          <p className="muted">Answers are graded only after you submit, like the paper LET.</p>

          <fieldset className="stack-sm">
            <legend className="label">How you take it</legend>
            {/* The one choice that changes the whole exam, so each option says what it means. */}
            <div className="options">
              <label className="option">
                <input type="radio" name="form" className="sr-only" checked={form === 'digital'} onChange={() => setForm('digital')} />
                <span className="option-title">On screen</span>
                <span className="meta">Booklet and bubble sheet on screen, with the timer.</span>
              </label>
              <label className="option">
                <input type="radio" name="form" className="sr-only" checked={form === 'printed'} onChange={() => setForm('printed')} />
                <span className="option-title">Printed</span>
                <span className="meta">Print it, answer with a pencil, then enter the answers.</span>
              </label>
            </div>
          </fieldset>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="mk-part">Part</label>
              <Select
                id="mk-part"
                value={part}
                onChange={(v) => {
                  setPart(v as Area);
                  setSubjects(null);
                }}
              >
                {partsFor(settings.level).map((a) => (
                  <option key={a} value={a}>
                    {PARTS[a].name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor="mk-len">Number of items</label>
              <Select id="mk-len" value={length} onChange={(v) => setLength(v as Length)}>
                <option value="short">Short: {SHORT} items</option>
                <option value="half">Half: {Math.round(PARTS[part].items / 2)} items</option>
                <option value="full">Full: {PARTS[part].items} items</option>
              </Select>
            </div>
            {form === 'digital' && (
              <div className="field">
                <label htmlFor="mk-min">Time limit, in minutes</label>
                <input
                  id="mk-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={defaultLimit === null ? 'No timer' : String(defaultLimit)}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
                <span className="meta">
                  {defaultLimit === null ? 'Blank for no timer.' : `Blank for the real LET time, ${defaultLimit} minutes.`} 0 turns the timer off.
                </span>
              </div>
            )}
          </div>

          <fieldset className="stack-sm">
            <legend className="label">Subjects</legend>
            <p className="meta">Items come from your quizzes in the subjects you pick, split evenly between them.</p>
            {all.map((s) => (
              <label key={s.id} className="check">
                <input type="checkbox" checked={subjects.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name} <span className="meta">({have.get(s.id) ?? 0})</span>
              </label>
            ))}
          </fieldset>

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

          <div role="status" className={ready ? undefined : 'well'}>
            {!subjects.length ? (
              <p>Pick at least one subject.</p>
            ) : ready ? (
              <p>
                {n} items, {need[0] === need[need.length - 1] ? need[0] : `${need[need.length - 1]} to ${need[0]}`} per subject.{' '}
                {form === 'digital' && (limit === null ? 'Timer off.' : `${limit} minutes.`)}
              </p>
            ) : (
              <div className="stack-sm">
                <p>Some subjects need more quiz questions for this many items:</p>
                <ul className="list">
                  {short.map((x) => (
                    <li key={x.id} className="spread">
                      <span>
                        {subareaName(x.id)}: {x.have} of {x.need}
                      </span>
                      <Link className={btn.secondary} to={`/quizzes/new?area=${part}&sub=${x.id}`}>
                        New {subareaName(x.id)} quiz
                      </Link>
                    </li>
                  ))}
                </ul>
                {length !== 'short' && (
                  <div>
                    <button type="button" className={btn.secondary} onClick={() => setLength('short')}>
                      Use {SHORT} items
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button type="submit" className={btn.primary} disabled={!ready}>
              {form === 'digital' ? 'Start exam' : 'Make printable exam'}
            </button>
          </div>
        </form>

        {done.length > 0 && (
          <section className="stack-sm" aria-labelledby="mk-done">
            <h2 id="mk-done">Past exams</h2>
            <ul className="list">
              {done.map((e) => {
                const p = examScore(e, qmap).pct;
                return (
                  <li key={e.id}>
                    <Link className="list-link subject-row" to={`/mock/${e.id}/results`}>
                      <span className="stack-sm">
                        <span className="mono">{e.label}</span>
                        <span className="row">
                          <Chip>{e.form === 'digital' ? 'Digital' : 'Printed'}</Chip>
                          <span className="meta">{PARTS[e.part].name}</span>
                        </span>
                      </span>
                      <span className={`subject-pct num ${scoreTone(p)}`}>{Math.round(p)}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link to="/mock/results">See all mock results</Link>
          </section>
        )}
      </div>
    </Page>
  );
}
