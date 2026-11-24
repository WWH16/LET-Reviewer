import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/Empty';
import { useStats } from '../progress/useStats';
import { PARTS, partsFor } from '../../domain/let-config';
import { btn } from '../../ui/btn';

/** Missed questions due today, by subject. Each subject reviews only its own misses. */
export function Missed() {
  const stats = useStats();
  if (!stats) return <Page title="Missed questions">{null}</Page>;

  const due = new Map<string, number>();
  for (const c of stats.due) {
    const q = stats.qmap.get(c.questionId);
    if (q) due.set(`${q.area}/${q.subarea}`, (due.get(`${q.area}/${q.subarea}`) ?? 0) + 1);
  }
  const later = [...stats.cards.values()].filter((c) => !c.mastered && c.due > stats.today).length;

  return (
    <Page title="Missed questions">
      <p className="muted">
        A question you miss in a quiz or mock comes back the next day. Get it right here and it comes back less often, until it stays
        learned.
      </p>
      {stats.due.length === 0 ? (
        <Empty
          icon="check"
          title="Nothing due today"
          text={later ? `${later} missed question${later === 1 ? ' comes' : 's come'} back on a later day.` : 'Questions you miss come back here the next day.'}
        >
          <Link className={btn.primary} to="/quizzes">
            Take a quiz
          </Link>
        </Empty>
      ) : (
        partsFor(stats.settings.level).map((area) => {
          const subs = PARTS[area].subareas.filter((s) => due.has(`${area}/${s.id}`));
          if (!subs.length) return null;
          return (
            <section key={area} className="stack-sm" aria-labelledby={`ms-${area}`}>
              <h2 id={`ms-${area}`}>{PARTS[area].name}</h2>
              <ul className="list">
                {subs.map((s) => {
                  const n = due.get(`${area}/${s.id}`)!;
                  return (
                    <li key={s.id} className="spread">
                      <span className="stack-sm">
                        <span>{s.name}</span>
                        <span className="meta">{n} due today</span>
                      </span>
                      <Link className={btn.primary} to={`/session?mode=review&area=${area}&sub=${s.id}`} aria-label={`Review ${s.name}`}>
                        Review
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </Page>
  );
}
