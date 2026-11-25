import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { useAnnounce } from '../../ui/Status';
import { useExams, useMeta } from '../../db/hooks';
import { dropTake, saveTake } from '../../db/repo';
import { PARTS, subareaName } from '../../domain/let-config';
import type { QuizTake } from '../../domain/types';
import { btn } from '../../ui/btn';
import { useQuizzes } from '../quizzes/useQuizzes';
import { examLink } from '../mock/newExam';

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Every quiz and mock she started and has not finished, each ready to continue where she left it. */
export function Unfinished() {
  const takes = useMeta<QuizTake[]>('quizTakes', []);
  const exams = useExams();
  const data = useQuizzes();
  const announce = useAnnounce();
  if (!takes || !exams || !data) return <Page title="Unfinished">{null}</Page>;

  const quizzes = takes.flatMap((t) => {
    const z = data.quizzes.find((x) => x.id === t.quizId);
    return z ? [{ t, z }] : [];
  });
  const mocks = exams.filter((e) => e.status !== 'graded');

  if (!quizzes.length && !mocks.length)
    return (
      <Page title="Unfinished">
        <Empty icon="check" title="Nothing unfinished" text="A quiz or mock you leave midway shows up here, ready to continue.">
          <Link className={btn.primary} to="/quizzes">
            Take a quiz
          </Link>
          <Link className={btn.secondary} to="/mock">
            Start a mock
          </Link>
        </Empty>
      </Page>
    );

  return (
    <Page title="Unfinished">
      {quizzes.length > 0 && (
        <section className="stack-sm" aria-labelledby="uf-quizzes">
          <h2 id="uf-quizzes">Quizzes</h2>
          <ul className="list">
            {quizzes.map(({ t, z }) => {
              const name = `${subareaName(z.subarea)}, ${z.name}`;
              const to = `/session?mode=quiz&quiz=${encodeURIComponent(t.quizId)}&take=${t.id}`;
              return (
                <li key={t.id} className="spread">
                  <Link className="list-link" to={to}>
                    <span className="stack-sm">
                      <span>{name}</span>
                      <span className="meta">
                        {t.results.length} of {t.items.length} answered{t.timed ? ', timed' : ''}. Left {when(t.updatedAt)}.
                      </span>
                    </span>
                  </Link>
                  <span className="row">
                    <Link className={btn.secondary} to={to} aria-label={`Continue ${name}`}>
                      Continue
                    </Link>
                    <button
                      type="button"
                      className={btn.quiet}
                      aria-label={`Discard ${name}`}
                      onClick={async () => {
                        await dropTake(t.id);
                        // Her answers so far are already saved; only the place in the quiz goes.
                        announce('Quiz take discarded', () => saveTake(t));
                      }}
                    >
                      Discard
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {mocks.length > 0 && (
        <section className="stack-sm" aria-labelledby="uf-mocks">
          <h2 id="uf-mocks">Mock exams</h2>
          <ul className="list">
            {mocks.map((e) => {
              const answered = Object.keys(e.answers).length;
              const printed = e.status === 'printed';
              const to = printed ? `/mock/${e.id}/entry` : examLink(e);
              return (
                <li key={e.id} className="spread">
                  <Link className="list-link" to={to}>
                    <span className="stack-sm">
                      <span className="mono">{e.label}</span>
                      <span className="meta">
                        {PARTS[e.part].name}.{' '}
                        {printed ? 'Printed; the answers are not entered yet.' : `${answered} of ${e.itemIds.length} answered.`}
                      </span>
                    </span>
                  </Link>
                  <Link className={btn.secondary} to={to} aria-label={`${printed ? 'Enter answers for' : 'Continue'} ${e.label}`}>
                    {printed ? 'Enter answers' : 'Continue'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Page>
  );
}
