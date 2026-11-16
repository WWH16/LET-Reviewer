import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { LEVEL_WEIGHTS, PARTS, partsFor, subareaName } from '../../domain/let-config';
import { pct, recentByArea, tallyBy, weakestTopics, weakTopicsText } from '../../domain/scoring';
import { templateB } from '../../domain/prompts';
import { useStats } from './useStats';
import { RatingCard } from './RatingCard';
import { btn } from '../../ui/btn';
import { drillMatches, drillUrl } from '../practice/DrillSetup';

const fmt = (p: number | null) => (p === null ? 'Not yet' : `${Math.round(p)}%`);

export function Progress() {
  const stats = useStats();
  const announce = useAnnounce();
  if (!stats) return <Page title="Progress">{null}</Page>;
  const { attempts, qmap, settings, rating, parts } = stats;

  if (!attempts.length)
    return (
      <Page title="Progress">
        <p>Answer some questions to see your progress.</p>
        <div>
          <Link className={btn.primary} to="/drill">
            Start practice
          </Link>
        </div>
      </Page>
    );

  // Sub-areas over the same recent window as each part's figure, so a tile's rows add up to its figure.
  const bySub = tallyBy([...recentByArea(attempts, qmap).values()].flat(), qmap, (q) => q.subarea);
  const weak = weakestTopics(attempts, qmap);

  const levelParts = partsFor(settings.level);

  return (
    <Page title="Progress" wide>
      <div className="bento">
        <RatingCard rating={rating} inverse className="progress-rating" />

        {/* One tile per part: its accuracy as the figure, then the sub-areas that make it up. */}
        {levelParts.map((a) => {
          const p = parts[a]?.pct ?? null;
          const n = parts[a]?.total ?? 0;
          return (
            <section key={a} className={`tile ${levelParts.length === 2 ? 'span-3' : 'span-2'}`} aria-labelledby={`pr-part-${a}`}>
              <h2 id={`pr-part-${a}`} className="label">
                {PARTS[a].name}
              </h2>
              <div className="stack-sm">
                <p className="display">{fmt(p)}</p>
                <span className="meter" aria-hidden="true">
                  <span style={{ width: `${p ?? 0}%` }} />
                </span>
                <p className="meta">
                  {Math.round(LEVEL_WEIGHTS[settings.level][a]! * 100)}% of your rating.{' '}
                  {n ? `Accuracy over your last ${n} ${n === 1 ? 'answer' : 'answers'}.` : 'No answers yet.'}
                </p>
              </div>
              <table>
                <caption className="sr-only">{PARTS[a].name} by sub-area</caption>
                <thead>
                  <tr>
                    <th scope="col">Sub-area</th>
                    <th scope="col" className="num">
                      Accuracy
                    </th>
                    <th scope="col" className="num">
                      Answers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PARTS[a].subareas.map((s) => {
                    const t = bySub.get(s.id);
                    const sp = pct(t);
                    return (
                      <tr key={s.id}>
                        <th scope="row">
                          <span className="stack-sm">
                            {s.name}
                            {sp !== null && (
                              <span className="meter" aria-hidden="true">
                                <span style={{ width: `${sp}%` }} />
                              </span>
                            )}
                          </span>
                        </th>
                        <td className="num">{fmt(sp)}</td>
                        <td className="num">{t?.total ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}

        <section className="tile" aria-labelledby="pr-weak">
          <div className="spread">
            <h2 id="pr-weak">Weakest topics</h2>
            {weak.length > 0 && (
              <button
                type="button"
                className={btn.secondary}
                onClick={async () => {
                  await copyText(weakTopicsText(weak));
                  announce('Weak topics copied');
                }}
              >
                Copy my weak topics
              </button>
            )}
          </div>
          {weak.length === 0 ? (
            <p className="muted">Topics appear here after 3 or more answers each.</p>
          ) : (
            <ul className="list">
              {weak.map((w) => {
                const name = w.topic || subareaName(w.subarea);
                const where = { area: w.area, sub: w.subarea, topic: w.topic };
                // Drill from review-center questions when the topic has any, else from the AI ones she answered.
                const ai = ![...qmap.values()].some((q) => drillMatches(q, { ...where, ai: false }));
                return (
                  <li key={`${w.subarea}-${w.topic}`} className="weak-item">
                    <span className="stack-sm">
                      <span>{name}</span>
                      <span className="meta">
                        {subareaName(w.subarea)}: {fmt(pct(w.tally))} over {w.tally.total} answers
                      </span>
                    </span>
                    <span className="row">
                      <Link className={btn.secondary} to={drillUrl({ ...where, n: 10, ai })} aria-label={`Practice ${name}`}>
                        Practice
                      </Link>
                      <button
                        type="button"
                        className={btn.quiet}
                        aria-label={`Copy prompt for ${name}`}
                        onClick={async () => {
                          await copyText(
                            templateB({ area: w.area, subarea: subareaName(w.subarea), topic: w.topic, level: settings.level, major: settings.major }),
                          );
                          announce('Prompt copied. Paste it into Claude with your notes.');
                        }}
                      >
                        Copy prompt
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
