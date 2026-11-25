import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExams, useMeta } from '../../db/hooks';
import { daysBetween } from '../../domain/dates';
import { useStats } from '../progress/useStats';
import { weakestSubjects } from '../../domain/scoring';
import { PARTS, subareaName } from '../../domain/let-config';
import { groupQuizzes } from '../../domain/quiz';
import type { QuizTake } from '../../domain/types';
import { FirstRun } from './FirstRun';
import { WeekStrip } from './WeekStrip';
import { btn } from '../../ui/btn';
import { Avatar } from '../../ui/Avatar';
import { Icon, type IconName } from '../../ui/Icon';

type Mode = { name: string; line: string; icon: IconName; to?: string; count?: number };


/**
 * Study: who is studying and how the week is going, then every way to study as one list of quiz modes.
 * Each row says what it does in a line; a mode with nothing to offer today says so instead of linking.
 */
export function Home() {
  const stats = useStats();
  const exams = useExams();
  const lastBackup = useMeta<{ at: string; attempts: number } | null>('lastBackup', null);
  const takes = useMeta<QuizTake[]>('quizTakes', []);

  if (!stats || !exams || lastBackup === undefined || !takes) return <Page title="Study" titleHidden>{null}</Page>;
  if (!stats.hasQuestions)
    return (
      <Page title="Study">
        <FirstRun />
      </Page>
    );

  const { days, today, settings, attempts, qmap } = stats;
  const open = exams.find((e) => e.status === 'in-progress' && e.form === 'digital');
  const printed = exams.find((e) => e.status === 'printed');
  const toExam = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const sinceBackup = attempts.length - (lastBackup?.attempts ?? 0);
  const backupDays = lastBackup ? daysBetween(lastBackup.at.slice(0, 10), today) : null;
  const remindBackup = sinceBackup >= 50 || (sinceBackup > 0 && (backupDays === null || backupDays >= 7));
  const name = settings.name.trim();

  const weakest = weakestSubjects(attempts, qmap)[0];
  const quizzes = groupQuizzes(qmap.values()).length;
  // Quiz takes left midway and mocks not graded yet.
  const unfinished = takes.length + exams.filter((e) => e.status !== 'graded').length;

  // A new quiz leads: it is how questions come in, and on a wide screen it is the large tile.
  const modes: Mode[] = [
    { name: 'New quiz', line: 'Pick a subject, ask Claude, then take it.', icon: 'lightning', to: '/quizzes/new' },
    {
      name: 'Unfinished',
      line: unfinished ? `${unfinished} to continue.` : 'Nothing left midway.',
      icon: 'clock',
      to: unfinished ? '/unfinished' : undefined,
      count: unfinished || undefined,
    },
    {
      name: 'Your quizzes',
      line: quizzes ? `${quizzes} ${quizzes === 1 ? 'quiz' : 'quizzes'} to retake, by subject.` : 'Quizzes you make show up here.',
      icon: 'practice',
      to: '/quizzes',
    },
    {
      name: 'Weakest subject',
      line: weakest ? `${subareaName(weakest.subarea)}, ${PARTS[weakest.area].name}.` : 'Shows up after 3 answers in a subject.',
      icon: 'target',
      to: weakest ? `/quizzes/${weakest.area}/${weakest.subarea}` : undefined,
    },
    { name: 'Mock exam', line: 'One part, the subjects you pick, on screen or printed.', icon: 'mock', to: '/mock' },
  ];

  const side = Boolean(open || printed || remindBackup);

  return (
    <Page title="Study" titleHidden wide>
      <div className="bento">
        <section className={`greet tile-inverse ${side ? 'span-4' : ''}`} aria-labelledby="greet-title">
          <div className="greet-head">
            <div className="stack-sm">
              <h2 id="greet-title" className="greet-title">
                {/* She is greeted as the teacher she is about to be: a Licensed Professional Teacher. */}
                {name ? `Welcome, ${name}, LPT` : 'Welcome, LPT'}
              </h2>
              <p className="meta">
                {toExam === null ? (
                  <Link to="/settings/exam" state={{ focus: 's-date' }}>
                    Set your exam date
                  </Link>
                ) : toExam > 0 ? (
                  `LET in ${toExam} ${toExam === 1 ? 'day' : 'days'}. Then you are an LPT.`
                ) : toExam === 0 ? (
                  'The LET is today. Go claim your LPT.'
                ) : (
                  <>
                    Exam date has passed.{' '}
                    <Link to="/settings/exam" state={{ focus: 's-date' }}>
                      Update it
                    </Link>
                  </>
                )}
              </p>
            </div>
            <Link to="/settings/profile" className="greet-avatar" aria-label="Profile">
              <Avatar who={settings} size={40} />
            </Link>
          </div>
          <WeekStrip days={days} today={today} />
        </section>

        {side && (
          <div className="home-side span-2">
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
                <Link className={btn.secondary} to="/settings/data" state={{ focus: 's-export' }}>
                  Back up now
                </Link>
              </p>
            )}
          </div>
        )}

        <section className="stack-sm" aria-labelledby="modes-title">
          <h2 id="modes-title">Study</h2>
          <ul className="modes">
            {modes.map((m) => {
              const body = (
                <>
                  <span className="mode-icon">
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
      </div>
    </Page>
  );
}
