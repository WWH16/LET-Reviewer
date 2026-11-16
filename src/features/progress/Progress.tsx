import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { copyText } from '../../ui/clipboard';
import { LEVEL_WEIGHTS, PARTS, partsFor, subareaName } from '../../domain/let-config';
import { pct, tallyBy, weakestTopics, weakTopicsText } from '../../domain/scoring';
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

  const bySub = tallyBy(attempts, qmap, (q) => q.subarea);
  const weak = weakestTopics(attempts, qmap);

  return (
    <Page title="Progress">
      <RatingCard rating={rating} />

      <section className="stack-sm" aria-labelledby="pr-parts">
        <h2 id="pr-parts">By part</h2>
        <p className="muted">Based on your last 150 answers in each part.</p>
        <table>
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col" className="num">
                Weight
              </th>
              <th scope="col" className="num">
                Accuracy
              </th>
              <th scope="col" className="num">
                Answers
              </th>
            </tr>
          </thead>
          <tbody>
            {partsFor(settings.level).map((a) => (
              <tr key={a}>
                <th scope="row">{PARTS[a].name}</th>
                <td className="num">{Math.round(LEVEL_WEIGHTS[settings.level][a]! * 100)}%</td>
                <td className="num">
                  {parts[a]?.pct != null && (
                    <span className="meter inline" aria-hidden="true">
                      <span style={{ width: `${parts[a]!.pct}%` }} />
                    </span>
                  )}
                  {fmt(parts[a]?.pct ?? null)}
                </td>
                <td className="num">{parts[a]?.total ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stack-sm" aria-labelledby="pr-weak">
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
                <li key={`${w.subarea}-${w.topic}`} className="stack-sm">
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

      <section className="stack-sm" aria-labelledby="pr-sub">
        <h2 id="pr-sub">By sub-area</h2>
        <table>
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
            {partsFor(settings.level).map((a) => (
              <Fragment key={a}>
                <tr>
                  <th scope="rowgroup" colSpan={3}>
                    {PARTS[a].name}
                  </th>
                </tr>
                {PARTS[a].subareas.map((s) => {
                  const t = bySub.get(s.id);
                  const p = pct(t);
                  return (
                    <tr key={s.id}>
                      <th scope="row" style={{ fontWeight: 400 }}>
                        <span className="stack-sm">
                          {s.name}
                          {p !== null && (
                            <span className="meter" aria-hidden="true">
                              <span style={{ width: `${p}%` }} />
                            </span>
                          )}
                        </span>
                      </th>
                      <td className="num">{fmt(p)}</td>
                      <td className="num">{t?.total ?? 0}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
