import { Link } from 'react-router-dom';
import { addDays, parseDay, streak } from '../../domain/dates';
import { Icon } from '../../ui/Icon';

/**
 * This week, Monday to Sunday: a filled dot on each day she studied, a ring on today, and the streak
 * beside it. The full activity grid lives on Stats.
 */
export function WeekStrip({ days, today }: { days: ReadonlyMap<string, number>; today: string }) {
  const monday = addDays(today, -((parseDay(today).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const run = streak(days, today);
  const doneToday = (days.get(today) ?? 0) > 0;

  return (
    <div className="week">
      <ol className="week-days" aria-label="This week">
        {week.map((day) => {
          const d = parseDay(day);
          const done = (days.get(day) ?? 0) > 0;
          const state = done ? 'done' : day === today ? 'today' : day > today ? 'ahead' : 'missed';
          return (
            <li key={day} className={`week-day is-${state}`} aria-current={day === today ? 'date' : undefined}>
              <span className="week-name" aria-hidden="true">
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
              <span className="week-dot">
                {done && <Icon name="check" size={14} />}
                <span className="sr-only">
                  {d.toLocaleDateString(undefined, { weekday: 'long' })}: {done ? 'studied' : day > today ? 'still ahead' : 'not studied'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {/* Loss aversion: a streak not yet kept today is framed as about to be lost, and leads to a quiz. */}
      {run > 0 && !doneToday ? (
        <Link className="week-streak is-at-risk" to="/quizzes">
          <Icon name="fire" size={18} />
          <span>
            Your <strong className="num">{run}</strong>-day streak ends tonight. Keep it
          </span>
          <Icon name="caret" size={14} />
        </Link>
      ) : (
        <p className="week-streak">
          <Icon name="fire" size={18} filled={doneToday} />
          <span>
            <strong className="num">{run}</strong> {run === 1 ? 'day' : 'days'} in a row
          </span>
        </p>
      )}
    </div>
  );
}
