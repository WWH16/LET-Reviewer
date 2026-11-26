import { Link, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { useSettings } from '../../db/hooks';
import { PARTS, subareaName } from '../../domain/let-config';
import type { Area } from '../../domain/types';
import { btn } from '../../ui/btn';
import { count, lastLine, quizDate, useQuizzes } from './useQuizzes';

/** One subject's quizzes, newest first, each ready to take again. */
export function Subject() {
  const { area = '', sub = '' } = useParams();
  const data = useQuizzes();
  const settings = useSettings();
  const part = PARTS[area as Area];
  const title = part ? `${subareaName(sub)} quizzes` : 'Quizzes';
  if (!data || !settings) return <Page title={title}>{null}</Page>;

  const mine = data.quizzes.filter((z) => z.area === area && z.subarea === sub).reverse();
  const newLink = `/quizzes/new?area=${area}&sub=${sub}`;

  return (
    <Page title={title} crumbs={[{ to: '/quizzes', label: 'Quizzes' }]}>
      <div className="spread">
        <p className="muted">
          {part?.name}
          {area === 'Major' && settings.major ? `: ${settings.major}` : ''}
        </p>
        <Link className={btn.primary} to={newLink}>
          New quiz
        </Link>
      </div>

      {mine.length === 0 ? (
        <Empty icon="practice" title={`No ${subareaName(sub)} quizzes yet`} text="Make one: the app writes the prompt, Claude writes the questions.">
          <Link className={btn.primary} to={newLink}>
            Make the first quiz
          </Link>
        </Empty>
      ) : (
        <section className="stack-sm" aria-labelledby="sb-quizzes">
          <h2 id="sb-quizzes">Quizzes</h2>
          <ul className="list">
            {mine.map((z) => (
              // The row opens the quiz (its questions, timed takes, removal); Take starts it at once.
              <li key={z.id} className="spread">
                <Link className="list-link" to={`/quiz/${encodeURIComponent(z.id)}`}>
                  <span className="stack-sm">
                    <span>{z.name}</span>
                    <span className="meta">
                      {count(z.questions.length, 'question')}, made {quizDate(z.createdAt)}. {lastLine(z.questions.map((q) => q.id), data.last)}.
                    </span>
                  </span>
                </Link>
                <Link className={btn.secondary} to={`/session?mode=quiz&quiz=${encodeURIComponent(z.id)}`} aria-label={`Take ${z.name}`}>
                  Take
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
