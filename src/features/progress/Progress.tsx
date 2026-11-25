import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useAnnounce } from '../../ui/Status';
import { LEVEL_WEIGHTS, PARTS, partsFor, subareaName } from '../../domain/let-config';
import { pct, recentByArea, weakestSubjects } from '../../domain/scoring';
import { useStats } from './useStats';
import { RatingCard } from './RatingCard';
import { btn } from '../../ui/btn';
import { Gauge, scoreTone } from '../../ui/Gauge';
import { StreakCard } from '../home/StreakCard';
import { Empty } from '../../ui/Empty';
import { loadDemoData } from '../../db/repo';
import { AsyncButton } from '../../ui/AsyncButton';

const fmt = (p: number | null) => (p === null ? 'Not yet' : `${Math.round(p)}%`);

export function Progress() {
  const stats = useStats();
  const announce = useAnnounce();
  if (!stats) return <Page title="Stats">{null}</Page>;
  const { attempts, qmap, settings, rating, parts, days, today, todayAttempts, todayCorrect } = stats;

  if (!attempts.length)
    return (
      <Page title="Stats">
        <Empty icon="stats" title="No answers yet" text="Your score, each subject and your weakest subjects show here after your first answers.">
          <Link className={btn.primary} to="/quizzes">
            Take a quiz
          </Link>
          <AsyncButton className={btn.secondary} onClick={async () => announce(`Added ${await loadDemoData()} sample answers`)}>
            Fill with sample answers
          </AsyncButton>
        </Empty>
      </Page>
    );

  // Subjects over the same recent window as each part's figure, so a part's subjects add up to its figure.
  const recentAttempts = [...recentByArea(attempts, qmap).values()].flat();
  const bySubject = weakestSubjects(recentAttempts, qmap, Infinity);

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
            </dl>
          </div>
        </section>

        <RatingCard rating={rating} className="span-2" />

        {/* Two tiles that read as one table: each part's figure on the left, every subject behind it on the
            right, weakest first, each row opening that subject's quizzes. On wide screens the subject list runs
            two rows tall and the streak fills the space under the parts, so no half of the screen stands empty. */}
        <section className="tile span-3 align-start" aria-labelledby="pr-subjects">
          <h2 id="pr-subjects">By part</h2>
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
                </li>
              );
            })}
          </ul>
        </section>

        <section className="tile span-3 rows-2 align-start" aria-labelledby="pr-weak">
          <h2 id="pr-weak">By subject, weakest first</h2>
          {bySubject.length === 0 ? (
            <p className="muted">Subjects appear here after 3 or more answers each.</p>
          ) : (
            <ul className="list">
              {bySubject.map((w) => {
                const p = pct(w.tally)!;
                return (
                  <li key={`${w.area}-${w.subarea}`}>
                    <Link className="list-link subject-row" to={`/quizzes/${w.area}/${w.subarea}`}>
                      <span className="stack-sm">
                        <span className="subject-name">{subareaName(w.subarea)}</span>
                        <span className="meta">
                          {PARTS[w.area].name}, {w.tally.total} answers
                        </span>
                      </span>
                      <span className={`subject-pct num ${scoreTone(p)}`}>{fmt(p)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <StreakCard days={days} today={today} todayCount={todayAttempts.length} todayCorrect={todayCorrect} className="span-3 align-start" />
      </div>
    </Page>
  );
}
