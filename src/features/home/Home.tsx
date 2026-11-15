import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExams, useMeta, useQuestions } from '../../db/hooks';
import { daysBetween, streak } from '../../domain/dates';
import { PARTS, subareaName } from '../../domain/let-config';
import { useStats } from '../progress/useStats';
import { RatingCard } from '../progress/RatingCard';
import { drillUrl, type DrillParams } from '../practice/DrillSetup';
import { FirstRun } from './FirstRun';

export function Home() {
  const questions = useQuestions();
  const stats = useStats();
  const exams = useExams();
  const lastDrill = useMeta<DrillParams | null>('lastDrill', null);
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);

  if (!questions || !stats || !exams || lastDrill === undefined || lastBackup === undefined) return <Page title="Home">{null}</Page>;
  if (!questions.length)
    return (
      <Page title="Home">
        <FirstRun />
      </Page>
    );

  const { due, rating, days, today, settings, attempts, todayAttempts, todayCorrect } = stats;
  const open = exams.find((e) => e.status === 'in-progress' && e.form === 'digital');
  const printed = exams.find((e) => e.status === 'printed');
  const run = streak(days, today);
  const toExam = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const sinceBackup = attempts.length - (lastBackup?.attempts ?? 0);
  const backupDays = lastBackup ? daysBetween(lastBackup.at.slice(0, 10), today) : null;
  const remindBackup = sinceBackup >= 50 || (sinceBackup > 0 && (backupDays === null || backupDays >= 7));

  return (
    <Page title="Home">
      <section className="stack-sm" aria-labelledby="home-due">
        <h2 id="home-due" className="label">
          Today
        </h2>
        <p className="display num">{due.length}</p>
        <p>{due.length === 1 ? 'review due' : 'reviews due'}</p>
        <div className="row">
          {due.length > 0 ? (
            <Link className="btn btn-primary" to="/review">
              Start review
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/session?mode=quick">
              Quick 10
            </Link>
          )}
          {open ? (
            <Link className="btn" to={`/mock/${open.id}`}>
              Continue exam {open.label} ({Object.keys(open.answers).length}/{open.itemIds.length})
            </Link>
          ) : printed ? (
            <Link className="btn" to={`/mock/${printed.id}/entry`}>
              Grade printed exam {printed.label}
            </Link>
          ) : lastDrill ? (
            <Link className="btn" to={drillUrl(lastDrill)}>
              Repeat: {lastDrill.sub ? subareaName(lastDrill.sub) : PARTS[lastDrill.area].name}, {lastDrill.n}
            </Link>
          ) : (
            <Link className="btn" to="/drill">
              Practice by topic
            </Link>
          )}
        </div>
      </section>

      {remindBackup && (
        <p className="notice spread">
          <span>
            {sinceBackup} answers since your {lastBackup ? `last backup on ${new Date(lastBackup.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'first session, with no backup yet'}.
          </span>
          <Link className="btn" to="/settings">
            Back up now
          </Link>
        </p>
      )}

      <RatingCard rating={rating} />

      <div className="grid-2">
        <div className="card stack-sm">
          <span className="label">Exam</span>
          {toExam === null ? (
            <Link to="/settings">Set your exam date</Link>
          ) : toExam >= 0 ? (
            <p>
              <span className="display num">{toExam}</span> {toExam === 1 ? 'day' : 'days'} left
            </p>
          ) : (
            <p>Exam date has passed. Update it in Settings.</p>
          )}
        </div>
        <div className="card stack-sm">
          <span className="label">Streak</span>
          <p>
            <span className="display num">{run}</span> {run === 1 ? 'day' : 'days'}
          </p>
          <p className="muted">
            Today: {todayCorrect}/{todayAttempts.length} correct
          </p>
        </div>
      </div>
    </Page>
  );
}
