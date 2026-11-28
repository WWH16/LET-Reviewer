import { Link } from 'react-router-dom';
import { Page } from '../../ui/Page';
import { useExams, useUnfinishedCount } from '../../db/hooks';
import { daysBetween } from '../../domain/dates';
import { useStats } from '../progress/useStats';
import { examScore } from '../../domain/scoring';
import { groupQuizzes } from '../../domain/quiz';
import { FirstRun } from './FirstRun';
import { WeekStrip } from './WeekStrip';
import { StreakCard } from './StreakCard';
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
  const unfinished = useUnfinishedCount();

  if (!stats || !exams || unfinished === undefined) return <Page title="Home" titleHidden>{null}</Page>;
  if (!stats.hasQuestions)
    return (
      <Page title="Home">
        <FirstRun />
      </Page>
    );

  const { days, today, settings, qmap, todayAttempts, todayCorrect } = stats;
  const toExam = settings.examDate ? daysBetween(today, settings.examDate) : null;
  const name = settings.name.trim();

  // Newest first, as useExams orders them.
  const graded = exams.filter((e) => e.status === 'graded');
  const latest = graded[0];
  const quizList = groupQuizzes(qmap.values());
  const quizzes = quizList.length;

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
      name: 'Mock results',
      line: latest
        ? `${graded.length} ${graded.length === 1 ? 'exam' : 'exams'}. Latest ${latest.label}, ${Math.round(examScore(latest, qmap).pct)}%.`
        : 'Scores from your mock exams show up here.',
      icon: 'stats',
      to: latest ? '/mock/results' : undefined,
    },
    { name: 'Mock exam', line: 'One part, the subjects you pick, on screen or printed.', icon: 'mock', to: '/mock' },
  ];


  return (
    <Page title="Home" titleHidden wide>
      <div className="bento">
        <section className="greet tile-inverse" aria-labelledby="greet-title">
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

        <section className="stack-sm" aria-labelledby="modes-title">
          <h2 id="modes-title">Home</h2>
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

        {/* Study days: the streak, and the Year and Month views of every day she answered. */}
        <StreakCard days={days} today={today} todayCount={todayAttempts.length} todayCorrect={todayCorrect} />
      </div>
    </Page>
  );
}
