import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Dialog } from '../../ui/Dialog';
import { Empty } from '../../ui/Empty';
import { useAnnounce } from '../../ui/Status';
import { removeQuiz, restoreQuestions } from '../../db/repo';
import { subareaName } from '../../domain/let-config';
import { topicName } from '../../domain/subjects';
import { btn } from '../../ui/btn';
import { count, lastLine, quizDate, useQuizzes } from './useQuizzes';

/** One quiz: take it, timed or not, fix a question, or remove the whole quiz. */
export function QuizPage() {
  const { id = '' } = useParams();
  const data = useQuizzes();
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  const announce = useAnnounce();
  if (!data) return <Page title="Quiz">{null}</Page>;

  const z = data.quizzes.find((x) => x.id === id);
  if (!z)
    return (
      <Page title="Quiz not found" back={{ to: '/quizzes', label: 'Quizzes' }}>
        <Empty icon="practice" title="This quiz is not on this device" text="It may have been removed.">
          <Link className={btn.primary} to="/quizzes">
            Back to Quizzes
          </Link>
        </Empty>
      </Page>
    );

  const subject = subareaName(z.subarea);
  const take = `/session?mode=quiz&quiz=${encodeURIComponent(z.id)}`;
  const back = `/quizzes/${z.area}/${z.subarea}`;

  return (
    <Page title={`${subject}, ${z.name}`} back={{ to: back, label: `${subject} quizzes` }}>
      <p className="muted">
        {z.topicId ? `Topic: ${topicName(z.subarea, z.topicId)}. ` : z.area === 'Major' ? '' : 'The whole subject. '}
        {count(z.questions.length, 'question')}, made {quizDate(z.createdAt)}. {lastLine(z.questions.map((q) => q.id), data.last)}.
      </p>
      <div className="row">
        <Link className={btn.primary} to={take}>
          Take quiz
        </Link>
        <Link className={btn.secondary} to={`${take}&timed=1`}>
          Take timed
        </Link>
      </div>
      <p className="meta">Every take shuffles the questions and their choices. Timed uses the real LET pace per item.</p>

      <section className="stack-sm" aria-labelledby="qp-list">
        <h2 id="qp-list">Questions</h2>
        <p className="meta">Open one to fix its answer or wording, or to remove it.</p>
        <ul className="list">
          {z.questions.map((q, i) => (
            <li key={q.id}>
              <Link className="list-link review-row" to={`/question/${encodeURIComponent(q.id)}`}>
                <span className="num meta">{i + 1}</span>
                <span className="meta">Answer {q.answer}</span>
                <span className="clamp-2" lang={q.lang}>
                  {q.stem}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <button type="button" className={btn.secondary} onClick={() => setConfirm(true)}>
          Remove quiz
        </button>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Remove ${subject}, ${z.name}?`}>
        <p>Its {count(z.questions.length, 'question')} leave your quizzes and future mocks. Your past answers stay in Stats.</p>
        <div className="row">
          <button type="button" className={btn.primary} data-autofocus onClick={() => setConfirm(false)}>
            Keep it
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={async () => {
              const ids = await removeQuiz(z.id);
              announce('Quiz removed', () => restoreQuestions(ids));
              navigate(back);
            }}
          >
            Remove quiz
          </button>
        </div>
      </Dialog>
    </Page>
  );
}
