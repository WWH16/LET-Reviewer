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
import { drillMatches, drillUrl } from '../practice/drill';
import { Gauge, scoreTone } from '../../ui/Gauge';
import { StreakCard } from '../home/StreakCard';
import { Empty } from '../../ui/Empty';
import { Icon } from '../../ui/Icon';
import { loadDemoData } from '../../db/repo';

const fmt = (p: number | null) => (p === null ? 'Not yet' : `${Math.round(p)}%`);

export function Progress() {
  const stats = useStats();
  const announce = useAnnounce();
  if (!stats) return <Page title="Stats">{null}</Page>;
  const { attempts, qmap, settings, rating, parts, days, today, todayAttempts, todayCorrect, due } = stats;

  if (!attempts.length)
    return (
      <Page title="Stats">
        <Empty icon="stats" title="No answers yet" text="Your score, each subject and your weakest topics show here after your first answers.">
          <Link className={btn.primary} to="/session?mode=quick">
            Start a Quick 10
          </Link>
          <button type="button" className={btn.secondary} onClick={async () => announce(`Added ${await loadDemoData()} sample answers`)}>
            Fill with sample answers
          </button>
        </Empty>
      </Page>
    );

  // Sub-areas over the same recent window as each part's figure, so a tile's rows add up to its figure.
  const bySub = tallyBy([...recentByArea(attempts, qmap).values()].flat(), qmap, (q) => q.subarea);
  const weak = weakestTopics(attempts, qmap);

  const levelParts = partsFor(settings.level);

  // The ring: accuracy over each part's recent window, all parts together.
  const recent = levelParts.map((a) => parts[a]).filter((v) => v !== undefined);
  const answered = recent.reduce((s, v) => s + v!.total, 0);
  const right = Math.round(recent.reduce((s, v) => s + (v!.pct * v!.total) / 100, 0));

  return (
    <Page title="Stats" wide>
      <div className="bento">
        {/* The screen's yellow block: one ring for how often you are right, as on a phone exam-prep app. */}
        <section className="tile tile-inverse stats-hero span-4" aria-label="Your score">
          <Gauge pct={answered ? (right / answered) * 100 : null} label="correct" />
          <div className="stats-side">
            <div>
              <p className="stats-count">
                <span className="num">{right}</span> of <span className="num">{answered}</span> answered correctly
              </p>
              <p className="meta">Each part’s most recent 150 answers.</p>
            </div>
            <dl className="stat-row">
              <div>
                <dt>Answers</dt>
                <dd className="num">{attempts.length}</dd>
              </div>
              <div>
                <dt>Study days</dt>
                <dd className="num">{days.size}</dd>
              </div>
              <div>
                <dt>Due today</dt>
                <dd className="num">{due.length}</dd>
              </div>
            </dl>
          </div>
        </section>

        <RatingCard rating={rating} className="span-2" />

        <section className="tile span-3 align-start" aria-labelledby="pr-subjects">
          <h2 id="pr-subjects">Subject scores</h2>
          <ul className="subjects">
            {levelParts.map((a) => {
              const p = parts[a]?.pct ?? null;
              const n = parts[a]?.total ?? 0;
              return (
                <li key={a} className="subject">
                  <div className="subject-head">
                    <span className="subject-name">{PARTS[a].name}</span>
                    <span className={`subject-pct num ${p === null ? '' : scoreTone(p)}`}>{fmt(p)}</span>
                  </div>
                  <span className="meter" aria-hidden="true">
                    <span style={{ width: `${p ?? 0}%` }} />
                  </span>
                  <p className="meta">
                    {Math.round(LEVEL_WEIGHTS[settings.level][a]! * 100)}% of your rating.{' '}
                    {n ? `${Math.round(((p ?? 0) * n) / 100)} of your last ${n} correct.` : 'No answers yet.'}
                  </p>
                  <details>
                    <summary className="label">Sub-areas</summary>
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
                          const tally = bySub.get(s.id);
                          const sp = pct(tally);
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
                              <td className="num">{tally?.total ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="tile span-3 align-start" aria-labelledby="pr-weak">
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
                      <span className="weak-name">{name}</span>
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
                        <Icon name="copy" size={18} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <StreakCard days={days} today={today} todayCount={todayAttempts.length} todayCorrect={todayCorrect} />
      </div>
    </Page>
  );
}
