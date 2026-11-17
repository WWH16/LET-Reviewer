import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExams, useMeta } from '../../db/hooks';
import { daysBetween } from '../../domain/dates';
import { useStats } from '../progress/useStats';
import { weakestTopics } from '../../domain/scoring';
import { subareaName } from '../../domain/let-config';
import { drillMatches, drillUrl, type DrillParams } from '../practice/DrillSetup';
import { FirstRun } from './FirstRun';
import { WeekStrip } from './WeekStrip';
import { btn } from '../../ui/btn';
import { Avatar } from '../../ui/Avatar';
import { Icon, type IconName } from '../../ui/Icon';

type Mode = { name: string; line: string; icon: IconName; tone: string; to?: string; count?: number };

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

/**
 * Study: who is studying and how the week is going, then every way to study as one list of quiz modes.
 * Each row says what it does in a line; a mode with nothing to offer today says so instead of linking.
 */
export function Home() {
  const stats = useStats();
  const exams = useExams();
  const lastDrill = useMeta<DrillParams | null>('lastDrill', null);
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);

  if (!stats || !exams || lastDrill === undefined || lastBackup === undefined) return <Page title="Study" titleHidden>{null}</Page>;
  if (!stats.hasQuestions)
    return (
      <Page title="Study">
        <FirstRun />
      </Page>
    );

  const { due, days, today, settings, attempts, qmap, todayAttempts } = stats;
  const open = exams.find((e) => e.status === 'in-progress' && e.form === 'digital');
  const printed = exams.find((e) => e.status === 'printed');
  const toExam = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const sinceBackup = attempts.length - (lastBackup?.attempts ?? 0);
  const backupDays = lastBackup ? daysBetween(lastBackup.at.slice(0, 10), today) : null;
  const remindBackup = sinceBackup >= 50 || (sinceBackup > 0 && (backupDays === null || backupDays >= 7));
  const name = settings.name.trim();

  const weakest = weakestTopics(attempts, qmap)[0];
  const weakestTo = weakest
    ? (() => {
        const where = { area: weakest.area, sub: weakest.subarea, topic: weakest.topic };
        const ai = ![...qmap.values()].some((q) => drillMatches(q, { ...where, ai: false }));
        return drillUrl({ ...where, n: 10, ai });
      })()
    : undefined;
  const qotdDone = todayAttempts.some((a) => a.mode === 'qotd');

  const modes: Mode[] = [
    {
      name: 'Question of the Day',
      line: qotdDone ? 'Done for today. A new one comes tomorrow.' : 'One question, new each day.',
      icon: 'sun',
      tone: 'amber',
      to: '/session?mode=qotd',
    },
    { name: 'Quick 10', line: 'Due reviews first, then a random mix.', icon: 'lightning', tone: 'blue', to: '/session?mode=quick' },
    {
      name: 'Missed questions',
      line: due.length ? `${due.length} due today.` : 'Nothing due today. Misses come back the next day.',
      icon: 'retry',
      tone: 'red',
      to: due.length ? '/review' : undefined,
      count: due.length || undefined,
    },
    {
      name: 'Weakest subject',
      line: weakest ? `${weakest.topic || subareaName(weakest.subarea)}, ${subareaName(weakest.subarea)}.` : 'Shows up after 3 answers in a topic.',
      icon: 'target',
      tone: 'violet',
      to: weakestTo,
    },
    { name: 'Timed quiz', line: '10 questions against the LET clock.', icon: 'timer', tone: 'teal', to: '/session?mode=timed' },
    {
      name: 'Build your own',
      line: lastDrill ? `Pick a part, sub-area and topic. Last: ${subareaName(lastDrill.sub) || 'all sub-areas'}.` : 'Pick a part, sub-area, topic and count.',
      icon: 'sliders',
      tone: 'slate',
      to: '/drill',
    },
    { name: 'Mock exam', line: 'A full or short exam, on screen or printed.', icon: 'mock', tone: 'navy', to: '/mock' },
  ];

  return (
    <Page title="Study" titleHidden>
      <section className="greet" aria-labelledby="greet-title">
        <div className="greet-head">
          <div className="stack-sm">
            <h2 id="greet-title" className="greet-title">
              {greeting(new Date().getHours())}
              {name ? `, ${name}` : ''}
            </h2>
            <p className="meta">
              {toExam === null ? (
                <Link to="/settings" state={{ focus: 's-date' }}>
                  Set your exam date
                </Link>
              ) : toExam > 0 ? (
                `LET in ${toExam} ${toExam === 1 ? 'day' : 'days'}.`
              ) : toExam === 0 ? (
                'The LET is today.'
              ) : (
                <>
                  Exam date has passed.{' '}
                  <Link to="/settings" state={{ focus: 's-date' }}>
                    Update it
                  </Link>
                </>
              )}
            </p>
          </div>
          <Link to="/settings" className="greet-avatar" aria-label="Profile and settings">
            <Avatar who={settings} size={48} />
          </Link>
        </div>
        <WeekStrip days={days} today={today} />
      </section>

      {(open || printed) && (
        <Link className="resume" to={open ? `/mock/${open.id}` : `/mock/${printed!.id}/entry`}>
          <span className="stack-sm">
            <span className="resume-title">{open ? `Continue exam ${open.label}` : `Enter answers for ${printed!.label}`}</span>
            <span className="meta">
              {open ? `${Object.keys(open.answers).length} of ${open.itemIds.length} answered.` : 'The printed exam is waiting to be graded.'}
            </span>
          </span>
          <Icon name="caret" size={20} />
        </Link>
      )}

      {remindBackup && (
        <p className="notice spread">
          <span>
            {sinceBackup} {sinceBackup === 1 ? 'answer' : 'answers'} since your{' '}
            {lastBackup ? `last backup on ${new Date(lastBackup.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'first session, with no backup yet'}.
          </span>
          <Link className={btn.secondary} to="/settings" state={{ focus: 's-export' }}>
            Back up now
          </Link>
        </p>
      )}

      <section className="stack-sm" aria-labelledby="modes-title">
        <h2 id="modes-title">Quiz modes</h2>
        <ul className="modes">
          {modes.map((m) => {
            const body = (
              <>
                <span className={`mode-icon tone-${m.tone}`}>
                  <Icon name={m.icon} size={20} />
                </span>
                <span className="mode-text">
                  <span className="mode-name">{m.name}</span>
                  <span className="meta">{m.line}</span>
                </span>
                {m.count !== undefined && <span className="mode-count num">{m.count}</span>}
                {m.to && <Icon name="caret" size={18} />}
              </>
            );
            return (
              <li key={m.name}>
                {m.to ? (
                  <Link className="mode" to={m.to}>
                    {body}
                  </Link>
                ) : (
                  <div className="mode is-idle">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </Page>
  );
}
