import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { scoreTone } from '../../ui/Gauge';
import { btn } from '../../ui/btn';
import { useExams, useQuestionMap } from '../../db/hooks';
import { PARTS, PART_FLOOR } from '../../domain/let-config';
import { examScore } from '../../domain/scoring';
import { fmtDate } from '../../domain/dates';

/** Every graded mock exam, newest first, with the totals across them. Each row opens that exam's results. */
export function MockHistory() {
  const exams = useExams();
  const qmap = useQuestionMap();
  if (!exams || !qmap) return <Page title="Mock results">{null}</Page>;

  const graded = exams.filter((e) => e.status === 'graded').map((e) => ({ e, s: examScore(e, qmap) }));
  if (!graded.length)
    return (
      <Page title="Mock results">
        <Empty icon="mock" title="No graded exams yet" text="Each mock exam you submit shows here with its score.">
          <Link className={btn.primary} to="/mock">
            Take a mock exam
          </Link>
        </Empty>
      </Page>
    );

  const avg = graded.reduce((sum, x) => sum + x.s.pct, 0) / graded.length;
  const best = Math.max(...graded.map((x) => x.s.pct));

  return (
    <Page title="Mock results" wide crumbs={[{ to: '/mock', label: 'Mock exams' }]}>
      <div className="bento">
        <section className="tile tile-inverse" aria-label="All mock exams">
          <dl className="stat-row">
            <div>
              <dt>Exams</dt>
              <dd className="num">{graded.length}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd className="num">{Math.round(avg)}%</dd>
            </div>
            <div>
              <dt>Best</dt>
              <dd className="num">{Math.round(best)}%</dd>
            </div>
          </dl>
        </section>

        <section className="tile" aria-labelledby="mh-list">
          <h2 id="mh-list">Every exam, newest first</h2>
          <ul className="list">
            {graded.map(({ e, s }) => (
              <li key={e.id}>
                <Link className="list-link subject-row" to={`/mock/${e.id}/results`}>
                  <span className="stack-sm">
                    <span className="mono">{e.label}</span>
                    <span className="meta">
                      {PARTS[e.part].name}, {e.form}, {fmtDate(e.submittedAt ?? e.updatedAt)}. {s.correct} of {s.total} right
                      {s.pct < PART_FLOOR ? `, below the ${PART_FLOOR}% floor` : ''}.
                    </span>
                  </span>
                  <span className={`subject-pct num ${scoreTone(s.pct)}`}>{Math.round(s.pct)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Page>
  );
}
