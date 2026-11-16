import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { Stem } from '../../ui/Stem';
import { useExam, useExams, useQuestionMap, useSettings } from '../../db/hooks';
import { formatClock } from '../../domain/dates';
import { LEVEL_WEIGHTS, PARTS, PART_FLOOR, paceMs } from '../../domain/let-config';
import { projectedRating } from '../../domain/scoring';
import type { Area, MockExam, Question } from '../../domain/types';
import { RatingCard } from '../progress/RatingCard';
import { btn } from '../../ui/btn';

type Filter = 'all' | 'wrong' | 'flagged' | 'unanswered';

export function examScore(e: MockExam, qmap: ReadonlyMap<string, Question>) {
  let correct = 0;
  e.itemIds.forEach((id, i) => {
    const q = qmap.get(id);
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
    .map((qid, i) => ({ n: i + 1, q: qmap.get(qid), chosen: exam.answers[String(i + 1)] ?? null }))
    .filter(({ n, q, chosen }) => {
      if (filter === 'wrong') return q && chosen !== null && chosen !== q.answer;
      if (filter === 'flagged') return exam.flags.includes(n);
      if (filter === 'unanswered') return chosen === null;
      return true;
    });

  const wrongCount = exam.itemIds.filter((qid, i) => qmap.get(qid)?.answer !== (exam.answers[String(i + 1)] ?? null)).length;

  const hasPacing = exam.form === 'digital' && checkpoints.length > 0;

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
          {wrongCount > 0 && <p className="muted">Wrong and blank items were added to Review.</p>}
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
