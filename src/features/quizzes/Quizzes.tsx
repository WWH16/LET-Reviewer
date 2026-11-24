import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { useSettings } from '../../db/hooks';
import { PARTS, partsFor } from '../../domain/let-config';
import { btn } from '../../ui/btn';
import { subjectsOf } from '../../domain/subjects';
import { count, useQuizzes } from './useQuizzes';

/** The subjects she has quizzes in, by part. Subjects and parts with none stay out of the list. */
export function Quizzes() {
  const data = useQuizzes();
  const settings = useSettings();
  if (!data || !settings) return <Page title="Quizzes">{null}</Page>;

  const parts = partsFor(settings.level)
    .map((area) => ({
      area,
      subjects: subjectsOf(area, settings.subjects, data.qmap.values())
        .map((s) => ({ ...s, quizzes: data.quizzes.filter((z) => z.area === area && z.subarea === s.id) }))
        .filter((s) => s.quizzes.length > 0),
    }))
    .filter((p) => p.subjects.length > 0);

  if (!parts.length)
    return (
      <Page title="Quizzes">
        <Empty icon="practice" title="No quizzes yet" text="Pick a subject, copy the prompt to Claude, and paste the reply back.">
          <Link className={btn.primary} to="/quizzes/new">
            Make a quiz
          </Link>
        </Empty>
      </Page>
    );

  return (
    <Page title="Quizzes" wide>
      <div>
        <Link className={btn.primary} to="/quizzes/new">
          New quiz
        </Link>
      </div>
      <div className="bento pairs">
        {parts.map(({ area, subjects }) => (
          <section key={area} className="tile span-3 stack-sm" aria-labelledby={`qz-${area}`}>
            <h2 id={`qz-${area}`}>
              {PARTS[area].name}
              {area === 'Major' && settings.major ? `: ${settings.major}` : ''}
            </h2>
            <ul className="list">
              {subjects.map((s) => (
                <li key={s.id} className="spread">
                  <Link className="stack-sm" to={`/quizzes/${area}/${s.id}`}>
                    <span>{s.name}</span>
                    <span className="meta">
                      {count(s.quizzes.length, 'quiz')}, {count(s.quizzes.reduce((sum, z) => sum + z.questions.length, 0), 'question')}
                    </span>
                  </Link>
                  <Link className={btn.secondary} to={`/quizzes/new?area=${area}&sub=${s.id}`} aria-label={`New ${s.name} quiz`}>
                    New quiz
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}
