import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExams, useMeta } from '../../db/hooks';
import { daysBetween, longestStreak } from '../../domain/dates';
import { StreakCard } from './StreakCard';
import { useStats } from '../progress/useStats';
import { RatingCard } from '../progress/RatingCard';
import { drillUrl, type DrillParams } from '../practice/DrillSetup';
import { FirstRun } from './FirstRun';
import { btn } from '../../ui/btn';
import { Avatar } from '../../ui/Avatar';

export function Home() {
  const stats = useStats();
  const exams = useExams();
  const lastDrill = useMeta<DrillParams | null>('lastDrill', null);
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);

  if (!stats || !exams || lastDrill === undefined || lastBackup === undefined) return <Page title="Home">{null}</Page>;
  if (!stats.hasQuestions)
    return (
      <Page title="Home">
        <FirstRun />
      </Page>
    );

  const { due, rating, days, today, settings, attempts, todayAttempts, todayCorrect } = stats;
  const open = exams.find((e) => e.status === 'in-progress' && e.form === 'digital');
  const printed = exams.find((e) => e.status === 'printed');
  const longest = longestStreak(days.keys());
  const toExam = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const sinceBackup = attempts.length - (lastBackup?.attempts ?? 0);
  const backupDays = lastBackup ? daysBetween(lastBackup.at.slice(0, 10), today) : null;
  const remindBackup = sinceBackup >= 50 || (sinceBackup > 0 && (backupDays === null || backupDays >= 7));

  return (
    <Page title="Home" titleHidden wide>
      <div className="home">
      <section className="tray" aria-labelledby="home-due">
        <div className="spread">
          <h2 id="home-due">{settings.name.trim() ? `Today, ${settings.name.trim()}` : 'Today'}</h2>
          <Avatar who={settings} size={40} />
        </div>
        {due.length > 0 ? (
          <p className="tray-figure">
            <span className="display">{due.length}</span>
            <span>{due.length === 1 ? 'review due' : 'reviews due'}</span>
          </p>
        ) : (
          <p className="tray-figure">
            <span className="display">{todayAttempts.length}</span>
            <span>
              answered today
              <span className="muted"> (no reviews due)</span>
            </span>
          </p>
        )}
        <div className="row">
          {due.length > 0 ? (
            <Link className={btn.primary} to="/review">
              Start review
            </Link>
          ) : (
            <Link className={btn.primary} to="/session?mode=quick">
              Quick 10
            </Link>
          )}
          {open ? (
            <Link className={btn.secondary} to={`/mock/${open.id}`}>
              Continue exam {open.label} ({Object.keys(open.answers).length}/{open.itemIds.length})
            </Link>
          ) : printed ? (
            <Link className={btn.secondary} to={`/mock/${printed.id}/entry`}>
              Grade printed exam {printed.label}
            </Link>
          ) : lastDrill ? (
            <Link className={btn.secondary} to={drillUrl(lastDrill)}>
              Repeat last drill
            </Link>
          ) : (
            <Link className={btn.secondary} to="/drill">
              Practice by topic
            </Link>
          )}
        </div>
      </section>

      {remindBackup && (
        <p className="notice spread">
          <span>
            {sinceBackup} {sinceBackup === 1 ? 'answer' : 'answers'} since your {lastBackup ? `last backup on ${new Date(lastBackup.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'first session, with no backup yet'}.
          </span>
          <Link className={btn.secondary} to="/settings" state={{ focus: 's-export' }}>
            Back up now
          </Link>
        </p>
      )}

      <RatingCard rating={rating} />

      <div className="stat-row">
        <div>
          <span className="label">Exam</span>
          {toExam === null ? (
            <Link className="stat-link" to="/settings" state={{ focus: 's-date' }}>
              Set your exam date
            </Link>
          ) : toExam >= 0 ? (
            <p>
              <span className="stat-figure">{toExam}</span> {toExam === 1 ? 'day' : 'days'} left
            </p>
          ) : (
            <p>
              Exam date has passed.{' '}
              <Link className="stat-link" to="/settings" state={{ focus: 's-date' }}>
                Update it
              </Link>
            </p>
          )}
        </div>
        <div>
          <span className="label">Longest streak</span>
          <p>
            <span className="stat-figure">{longest}</span> {longest === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      <StreakCard days={days} today={today} todayCount={todayAttempts.length} todayCorrect={todayCorrect} />
      </div>
    </Page>
  );
}
