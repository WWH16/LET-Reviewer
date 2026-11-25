import { Link, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { useSettings } from '../../db/hooks';
import { PARTS, subareaName } from '../../domain/let-config';
import { subjectsOf, topicName } from '../../domain/subjects';
import type { Area } from '../../domain/types';
import { btn } from '../../ui/btn';
import { count, lastLine, quizDate, useQuizzes } from './useQuizzes';

/** One subject: its topics, then its quizzes newest first, each ready to take again. */
export function Subject() {
  const { area = '', sub = '' } = useParams();
  const data = useQuizzes();
  const settings = useSettings();
  const part = PARTS[area as Area];
  const title = part ? `${subareaName(sub)} quizzes` : 'Quizzes';
  if (!data || !settings) return <Page title={title}>{null}</Page>;

  const subject = part ? subjectsOf(area as Area, settings.subjects, data.qmap.values()).find((s) => s.id === sub) : undefined;
  const topics = subject?.topics ?? [];
  const mine = data.quizzes.filter((z) => z.area === area && z.subarea === sub).reverse();
  const newLink = `/quizzes/new?area=${area}&sub=${sub}`;

  return (
    <Page title={title} back={{ to: '/quizzes', label: 'Quizzes' }}>
      <div className="spread">
        <p className="muted">
          {part?.name}
          {area === 'Major' && settings.major ? `: ${settings.major}` : ''}
        </p>
        <Link className={btn.primary} to={newLink}>
          New quiz
        </Link>
      </div>

      {topics.length > 0 && (
        <section className="stack-sm" aria-labelledby="sb-topics">
          <h2 id="sb-topics">Topics</h2>
          <ul className="list">
            {topics.map((t) => {
              const n = mine.filter((z) => z.topicId === t.id).length;
              return (
                <li key={t.id} className="spread">
                  <span className="stack-sm">
                    <span>{t.name}</span>
                    <span className="meta">{n ? count(n, 'quiz') : 'No quizzes yet'}</span>
                  </span>
                  <Link className={btn.secondary} to={`${newLink}&topic=${t.id}`} aria-label={`New quiz on ${t.name}`}>
                    New quiz
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {mine.length === 0 ? (
        <Empty icon="practice" title={`No ${subareaName(sub)} quizzes yet`} text={`Make one: pick this subject${topics.length ? ' or one of its topics' : ''}, and Claude writes the questions.`}>
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
                    <span>
                      {z.name}
                      {z.topicId && <span className="meta">, {topicName(z.subarea, z.topicId)}</span>}
                    </span>
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
