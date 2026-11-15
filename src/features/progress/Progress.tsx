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

const fmt = (p: number | null) => (p === null ? '—' : `${Math.round(p)}%`);

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
          <Link className="btn btn-primary" to="/drill">
            Start practice
          </Link>
        </div>
      </Page>
    );

  const bySub = tallyBy(attempts, qmap, (q) => q.subarea);
  const weak = weakestTopics(attempts, qmap);
  const weakest = weak[0];
  const summary =
    (rating.rating === null
      ? 'Not enough answers for a projected rating yet.'
      : `Projected rating ${rating.rating.toFixed(1)}%, ${rating.passes ? 'passing' : 'not passing yet'}.`) +
    (weakest ? ` Weakest topic: ${weakest.topic || subareaName(weakest.subarea)}, ${fmt(pct(weakest.tally))}.` : '');

  return (
    <Page title="Progress">
      <p>{summary}</p>
      <RatingCard rating={rating} />

      <section className="stack-sm" aria-labelledby="pr-parts">
        <h2 id="pr-parts">By part</h2>
        <p className="muted">Each part uses your most recent 150 scored answers.</p>
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
                <td className="num">{fmt(parts[a]?.pct ?? null)}</td>
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
              className="btn"
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
            {weak.map((w) => (
              <li key={`${w.subarea}-${w.topic}`} className="spread">
                <span className="stack-sm">
                  <span>{w.topic || subareaName(w.subarea)}</span>
                  <span className="label">
                    {subareaName(w.subarea)} · {fmt(pct(w.tally))} over {w.tally.total}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-quiet"
                  aria-label={`Copy prompt for ${w.topic || subareaName(w.subarea)}`}
                  onClick={async () => {
                    await copyText(
                      templateB({ area: w.area, subarea: subareaName(w.subarea), topic: w.topic, level: settings.level, major: settings.major }),
                    );
                    announce('Prompt copied. Paste it into Claude with your notes.');
                  }}
                >
                  Copy prompt
                </button>
              </li>
            ))}
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
                  <th scope="rowgroup" colSpan={3} className="label" style={{ paddingTop: 'var(--s4)' }}>
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
