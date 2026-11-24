import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useSettings } from '../../db/hooks';
import { PARTS, partsFor } from '../../domain/let-config';
import { btn } from '../../ui/btn';
import { useQuizzes } from './useQuizzes';

/** Every subject of every part she takes, with how many quizzes and questions it has. */
export function Quizzes() {
  const data = useQuizzes();
  const settings = useSettings();
  if (!data || !settings) return <Page title="Quizzes">{null}</Page>;

  return (
    <Page title="Quizzes" wide>
      <p className="muted">
        A quiz covers one subject. Make one by asking Claude for questions, then take it as often as you like. Mock exams draw
        their items from your quiz questions.
      </p>
      <div className="bento pairs">
        {partsFor(settings.level).map((area) => (
          <section key={area} className="tile span-3 stack-sm" aria-labelledby={`qz-${area}`}>
            <h2 id={`qz-${area}`}>{PARTS[area].name}</h2>
            <ul className="list">
              {PARTS[area].subareas.map((s) => {
                const mine = data.quizzes.filter((z) => z.area === area && z.subarea === s.id);
                const n = mine.reduce((sum, z) => sum + z.questions.length, 0);
                return (
                  <li key={s.id} className="spread">
                    <Link className="stack-sm" to={`/quizzes/${area}/${s.id}`}>
                      <span>{s.name}</span>
                      <span className="meta">
                        {mine.length ? `${mine.length} ${mine.length === 1 ? 'quiz' : 'quizzes'}, ${n} ${n === 1 ? 'question' : 'questions'}` : 'No quizzes yet'}
                      </span>
                    </Link>
                    <Link className={btn.secondary} to={`/quizzes/new?area=${area}&sub=${s.id}`} aria-label={`New ${s.name} quiz`}>
                      New quiz
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}
