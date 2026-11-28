import { useMemo, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { btn } from '../../ui/btn';
import { useMeta } from '../../db/hooks';
import { setMeta } from '../../db/repo';
import { heatLevel, heatWeeks, monthWeeks, parseDay, streak, type HeatDay } from '../../domain/dates';

// More weeks than any screen fits: the grid is pinned to today and the oldest weeks run off its left edge.
const WEEKS = 60;
const LEVELS = [0, 1, 2, 3, 4] as const;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const answers = (n: number) => (n === 0 ? 'No answers' : n === 1 ? '1 answer' : `${n} answers`);
const dayTitle = ({ day, count }: Pick<HeatDay, 'day' | 'count'>) =>
  `${answers(count)} on ${parseDay(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

type View = 'year' | 'month';

/**
 * The streak, and her study days two ways: Year, a GitHub-style grid of every day, and Month, a calendar
 * with each day's date on its shade. The choice is remembered on this device. The flame is solid once she
 * has answered today, and an outline while today is still open.
 */
export function StreakCard({
  days,
  today,
  todayCount,
  todayCorrect,
  className,
}: {
  /** Answers per study day. */
  days: ReadonlyMap<string, number>;
  today: string;
  todayCount: number;
  todayCorrect: number;
  /** Its place in a bento (Home: the full row under the ways to study, the default). */
  className?: string;
}) {
  const run = streak(days, today);
  const weeks = useMemo(() => heatWeeks(days, today, WEEKS), [days, today]);
  const view = useMeta<View>('streakView', 'year');
  const now = parseDay(today);
  const [shown, setShown] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const doneToday = todayCount > 0;

  // Months run from her first study day (or this month) to this one.
  const first = [...days.keys()].sort()[0];
  const start = first ? parseDay(first) : now;
  const index = (y: number, m: number) => y * 12 + m;
  const atStart = index(shown.y, shown.m) <= index(start.getFullYear(), start.getMonth());
  const atEnd = index(shown.y, shown.m) >= index(now.getFullYear(), now.getMonth());
  const step = (by: number) => {
    const d = new Date(shown.y, shown.m + by, 1);
    setShown({ y: d.getFullYear(), m: d.getMonth() });
  };
  const monthName = new Date(shown.y, shown.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const studied = [...days.keys()].filter((d) => d.startsWith(`${shown.y}-${String(shown.m + 1).padStart(2, '0')}`)).length;

  const status = doneToday
    ? `Today: ${todayCorrect} of ${todayCount} correct.`
    : run > 0
      ? 'Answer one question today to keep it going.'
      : days.size > 0
        ? 'Answer one question today to start a new streak.'
        : 'Answer one question to start a streak.';

  return (
    <section className={`tile streak ${className ?? ''}`} aria-labelledby="streak-title">
      <div className="spread">
        <h2 id="streak-title" className="label">
          Streak
        </h2>
        <div className="row" role="group" aria-label="Show study days as">
          {(['year', 'month'] as const).map((v) => (
            <button key={v} type="button" className={btn.secondary} aria-pressed={(view ?? 'year') === v} onClick={() => setMeta('streakView', v)}>
              {v === 'year' ? 'Year' : 'Month'}
            </button>
          ))}
        </div>
      </div>
      <p className="streak-figure">
        <Icon name="fire" size={24} filled={doneToday} />
        <span className="display">{run}</span>
        <span>{run === 1 ? 'day' : 'days'}</span>
      </p>
      <p className="muted">{status}</p>

      {(view ?? 'year') === 'year' ? (
        <div className="heat" role="img" aria-label={`Answers per day. You studied on ${days.size} ${days.size === 1 ? 'day' : 'days'} so far.`}>
          {weeks.map((week, i) => {
            const firstOfMonth = week.find((d) => d.day.endsWith('-01'));
            return (
              <div className="heat-week" key={week[0].day}>
                {/* A month's name sits over the week that holds its 1st. The last weeks skip it: it would run off the card. */}
                <span className="heat-month">
                  {firstOfMonth && i < weeks.length - 2 ? parseDay(firstOfMonth.day).toLocaleDateString(undefined, { month: 'short' }) : ''}
                </span>
                {week.map((d) => (
                  <span key={d.day} className="heat-day" data-level={d.level} title={dayTitle(d)} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal">
          <div className="cal-head">
            <button type="button" className={btn.quiet} aria-label="Previous month" disabled={atStart} onClick={() => step(-1)}>
              <span className="flip">
                <Icon name="caret" size={18} />
              </span>
            </button>
            <h3 aria-live="polite">{monthName}</h3>
            <button type="button" className={btn.quiet} aria-label="Next month" disabled={atEnd} onClick={() => step(1)}>
              <Icon name="caret" size={18} />
            </button>
          </div>
          <table className="cal-grid">
            <caption className="sr-only">
              Answers per day in {monthName}. You studied on {studied} {studied === 1 ? 'day' : 'days'}.
            </caption>
            <thead>
              <tr>
                {WEEKDAYS.map((w) => (
                  <th key={w} scope="col" abbr={w}>
                    {w.charAt(0)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthWeeks(shown.y, shown.m).map((week, i) => (
                <tr key={i}>
                  {week.map((day, j) => {
                    if (!day) return <td key={j} />;
                    const count = days.get(day) ?? 0;
                    const later = day > today;
                    return (
                      <td
                        key={day}
                        data-level={later ? undefined : heatLevel(count)}
                        className={day === today ? 'is-today' : later ? 'is-later' : undefined}
                        title={later ? undefined : dayTitle({ day, count })}
                      >
                        {Number(day.slice(8))}
                        {!later && <span className="sr-only">, {answers(count)}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="heat-legend" aria-hidden="true">
        Less
        {LEVELS.map((l) => (
          <span key={l} className="heat-day" data-level={l} />
        ))}
        More
      </p>
    </section>
  );
}
