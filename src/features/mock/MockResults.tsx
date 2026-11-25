import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Stem } from '../../ui/Stem';
import { useExam, useExams, useQuestionMap, useSettings } from '../../db/hooks';
import { formatClock } from '../../domain/dates';
import { LEVEL_WEIGHTS, PARTS, PART_FLOOR, paceMs } from '../../domain/let-config';
import { projectedRating } from '../../domain/scoring';
import type { Area, MockExam, Question } from '../../domain/types';
import { RatingCard } from '../progress/RatingCard';
import { shown } from '../../domain/choices';
import { counts } from '../../domain/quiz';
import { subjectsOf } from '../../domain/subjects';
import { shuffle } from '../../domain/examDraw';
import { saveExam } from '../../db/repo';
import { examLink, newExam } from './newExam';
import { btn } from '../../ui/btn';

type Filter = 'all' | 'wrong' | 'flagged' | 'unanswered';

/** Item i of an exam as it was shown, with the exam's choice order. */
export const examItem = (e: MockExam, i: number, qmap: ReadonlyMap<string, Question>) => {
  const q = qmap.get(e.itemIds[i]);
  return q && shown(q, e.orders?.[i]);
};

export function examScore(e: MockExam, qmap: ReadonlyMap<string, Question>) {
  let correct = 0;
  e.itemIds.forEach((id, i) => {
    const q = examItem(e, i, qmap);
    if (q && q.answer !== null && e.answers[String(i + 1)] === q.answer) correct++;
  });
  return { correct, total: e.itemIds.length, pct: e.itemIds.length ? (correct / e.itemIds.length) * 100 : 0 };
}

export function MockResults() {
  const { id } = useParams();
  const exam = useExam(id);
  const exams = useExams();
  const qmap = useQuestionMap();
  const settings = useSettings();
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>('all');
  const [retakeSubs, setRetakeSubs] = useState<string[] | null>(null);
  const navigate = useNavigate();
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const timeUp = (location.state as { timeUp?: boolean } | null)?.timeUp;

  useEffect(() => {
    if (timeUp) scoreRef.current?.focus();
  }, [timeUp]);

  const latestByPart = useMemo(() => {
    if (!exams || !qmap) return {};
    const out: Partial<Record<Area, { pct: number; label: string }>> = {};
    for (const e of exams) if (e.status === 'graded' && !out[e.part]) out[e.part] = { pct: examScore(e, qmap).pct, label: e.label };
    return out;
  }, [exams, qmap]);

  if (!exam || !qmap || !settings || !exams) return <Page title="Exam results">{null}</Page>;
  if (exam.status !== 'graded')
    return (
      <Page title="Not graded yet">
        <p>
          This exam has not been submitted. <Link to={exam.form === 'digital' ? `/mock/${exam.id}` : `/mock/${exam.id}/entry`}>Go back to it</Link>
        </p>
      </Page>
    );

  const s = examScore(exam, qmap);
  const weight = LEVEL_WEIGHTS[settings.level][exam.part];
  const rating = projectedRating(
    settings.level,
    Object.fromEntries(Object.entries(latestByPart).map(([a, v]) => [a, v!.pct])),
  );

  // Pacing: the time at which k items had been answered, against the real LET pace.
  const times = Object.values(exam.answeredAt).sort((a, b) => a - b);
  const pace = paceMs(exam.part);
  const checkpoints = [0.25, 0.5, 0.75, 1]
    .map((f) => Math.max(1, Math.round(exam.itemIds.length * f)))
    .filter((k) => k <= times.length)
    .map((k) => ({ k, at: times[k - 1], target: k * pace }));

  const rows = exam.itemIds
    .map((_, i) => ({ n: i + 1, q: examItem(exam, i, qmap), chosen: exam.answers[String(i + 1)] ?? null }))
    .filter(({ n, q, chosen }) => {
      if (filter === 'wrong') return q && chosen !== null && chosen !== q.answer;
      if (filter === 'flagged') return exam.flags.includes(n);
      if (filter === 'unanswered') return chosen === null;
      return true;
    });

  const wrongCount = exam.itemIds.filter((_, i) => examItem(exam, i, qmap)?.answer !== (exam.answers[String(i + 1)] ?? null)).length;

  const hasPacing = exam.form === 'digital' && checkpoints.length > 0;

  // The breakdown by subject, in the part's own order.
  const tally = new Map<string, { right: number; total: number }>();
  exam.itemIds.forEach((_, i) => {
    const q = examItem(exam, i, qmap);
    if (!q) return;
    const t = tally.get(q.subarea) ?? { right: 0, total: 0 };
    t.total++;
    if (q.answer !== null && exam.answers[String(i + 1)] === q.answer) t.right++;
    tally.set(q.subarea, t);
  });
  const bySubject = subjectsOf(exam.part, settings.subjects, [...tally.keys()].map((subarea) => ({ area: exam.part, subarea })))
    .filter((s) => tally.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, ...tally.get(s.id)!, pct: (tally.get(s.id)!.right / tally.get(s.id)!.total) * 100 }));
  const weakest = bySubject.length > 1 ? bySubject.reduce((w, x) => (x.pct < w.pct ? x : w)) : null;

  const again = retakeSubs ?? bySubject.map((x) => x.id);
  const againIds = exam.itemIds.filter((id) => {
    const q = qmap.get(id);
    return q && counts(q) && again.includes(q.subarea);
  });
  const retake = async () => {
    const next = newExam({
      part: exam.part,
      form: exam.form,
      itemIds: shuffle(againIds),
      qmap,
      subjects: again,
      paper: exam.paper,
      settings,
      labels: exams.map((e) => e.label),
    });
    await saveExam(next);
    navigate(examLink(next));
  };

  return (
    <Page title={`${exam.label} results`} wide>
      {timeUp && <p className="notice">Time is up. Your answers were submitted.</p>}
      {/* The score is the screen's dark mass; the rating and the pacing sit beside it. */}
      <div className="bento">
        <section className={`tile tile-inverse score-tile span-3 ${hasPacing ? 'rows-2' : ''}`} aria-labelledby="mr-score">
          <h2 id="mr-score" className="label">
            {PARTS[exam.part].name}, {exam.form === 'digital' ? 'digital' : 'printed'} exam
          </h2>
          <p ref={scoreRef} tabIndex={-1} className="score">
            <span className="display">
              {s.correct}/{s.total}
            </span>{' '}
            <span className="display-unit">{s.pct.toFixed(1)}%</span>
          </p>
          <p>
            {s.pct >= PART_FLOOR ? `Above the ${PART_FLOOR}% floor for this part.` : `Below the ${PART_FLOOR}% floor. A part under ${PART_FLOOR}% fails the exam.`}
            {weight ? ` This part is ${Math.round(weight * 100)}% of your rating.` : ''}
          </p>
          <p className="well">
            Time: {exam.form === 'digital' ? formatClock(exam.elapsedMs) : exam.totalMin !== null ? `${exam.totalMin} min (entered)` : 'not entered'}
            {exam.timeLimitMin !== null && ` of ${exam.timeLimitMin} min`}
          </p>
          {wrongCount > 0 && <p className="muted">Wrong and blank items were added to Missed questions.</p>}
        </section>

        <RatingCard rating={rating} warned={s.pct < PART_FLOOR ? exam.part : undefined} className="span-3">
          <p className="meta">
            Projected from your latest mock in each part:{' '}
            {Object.entries(latestByPart)
              .map(([a, v]) => `${PARTS[a as Area].name} ${v!.pct.toFixed(0)}% (${v!.label})`)
              .join(', ')}
            .
          </p>
        </RatingCard>

        <section className="tile span-3" aria-labelledby="mr-subjects">
          <h2 id="mr-subjects">By subject</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col" className="num">
                  Right
                </th>
                <th scope="col" className="num">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {bySubject.map((x) => (
                <tr key={x.id}>
                  <th scope="row">
                    {x.name}
                    {weakest?.id === x.id && <span className="meta">, weakest</span>}
                  </th>
                  <td className="num">
                    {x.right} / {x.total}
                  </td>
                  <td className="num">{Math.round(x.pct)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {weakest && (
            <Link to={`/quizzes/${exam.part}/${weakest.id}`}>Practice {weakest.name} in Quizzes</Link>
          )}
        </section>

        <section className="tile span-3" aria-labelledby="mr-retake">
          <h2 id="mr-retake">Retake</h2>
          <p className="meta">
            The same questions in a new order, with the choices shuffled again.{bySubject.length > 1 && ' Pick the subjects to take again.'}
          </p>
          {/* One subject has nothing to pick. */}
          {bySubject.length > 1 && (
          <fieldset className="stack-sm">
            <legend className="sr-only">Subjects to retake</legend>
            {bySubject.map((x) => (
              <label key={x.id} className="check">
                <input
                  type="checkbox"
                  checked={again.includes(x.id)}
                  onChange={() => setRetakeSubs(bySubject.map((y) => y.id).filter((y) => (y === x.id ? !again.includes(y) : again.includes(y))))}
                />
                {x.name} <span className="meta">({x.total} items)</span>
              </label>
            ))}
          </fieldset>
          )}
          <div className="row">
            <button type="button" className={btn.primary} disabled={!againIds.length} onClick={retake}>
              Retake {againIds.length} items
            </button>
            <Link className={btn.secondary} to="/mock">
              New mock, new questions
            </Link>
          </div>
        </section>

        {hasPacing && (
          <section className="tile span-3" aria-labelledby="mr-pace">
            <h2 id="mr-pace">Pacing</h2>
            <p className="muted">LET pace is where you would be at the real exam’s speed.</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Answered</th>
                  <th scope="col" className="num">
                    Time
                  </th>
                  <th scope="col" className="num">
                    LET pace
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((c) => (
                  <tr key={c.k}>
                    <th scope="row">{c.k} items</th>
                    <td className="num">
                      {formatClock(c.at)}
                      {c.at > c.target ? ', behind' : ''}
                    </td>
                    <td className="num">{formatClock(c.target)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <section className="stack reading" aria-labelledby="mr-check">
        <h2 id="mr-check">Checking the paper</h2>
        <div className="row" role="group" aria-label="Show">
          {(['all', 'wrong', 'flagged', 'unanswered'] as Filter[]).map((f) => (
            <button key={f} type="button" className={btn.secondary} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'wrong' ? 'Wrong only' : f === 'flagged' ? 'Flagged' : 'Unanswered'}
            </button>
          ))}
        </div>
        {rows.length === 0 && <p className="muted">No items match.</p>}
        <div className="stack-lg">
          {rows.map(({ n, q, chosen }) =>
            q ? (
              <article key={n} className="stack-sm result-item" aria-labelledby={`mr-h-${n}`}>
                <h3 id={`mr-h-${n}`} className="label">
                  Item {n}
                  {chosen === null ? ', unanswered' : chosen === q.answer ? ', correct' : ', wrong'}
                  {exam.flags.includes(n) ? ', flagged' : ''}
                </h3>
                <Stem id={`mr-s-${n}`} lang={q.lang} text={q.stem} />
                <ChoiceGroup name={`mr-${n}`} labelledBy={`mr-s-${n}`} lang={q.lang} choices={q.choices} value={chosen} locked correct={q.answer} />
                <p lang={q.lang}>
                  {q.explanation || 'No explanation saved.'}
                </p>
              </article>
            ) : null,
          )}
        </div>
      </section>

      <div className="row">
        <Link className={btn.primary} to="/mock">
          New exam
        </Link>
        <Link className={btn.secondary} to="/">
          Home
        </Link>
      </div>
    </Page>
  );
}
