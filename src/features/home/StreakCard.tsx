import { useMemo } from 'react';
import { Icon } from '../../ui/Icon';
import { heatWeeks, parseDay, streak, type HeatDay } from '../../domain/dates';

// More weeks than any screen fits: the grid is pinned to today and the oldest weeks run off its left edge.
const WEEKS = 60;
const LEVELS = [0, 1, 2, 3, 4] as const;

const dayTitle = ({ day, count }: HeatDay) =>
  `${count === 0 ? 'No answers' : count === 1 ? '1 answer' : `${count} answers`} on ${parseDay(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

/**
 * The streak and a GitHub-style activity grid: one square per study day, darker with more answers.
 * The flame is solid once she has answered today, and an outline while today is still open.
 */
export function StreakCard({
  days,
  today,
  todayCount,
  todayCorrect,
}: {
  /** Answers per study day. */
  days: ReadonlyMap<string, number>;
  today: string;
  todayCount: number;
  todayCorrect: number;
}) {
  const run = streak(days, today);
  const weeks = useMemo(() => heatWeeks(days, today, WEEKS), [days, today]);
  const doneToday = todayCount > 0;

  const status = doneToday
    ? `Today: ${todayCorrect} of ${todayCount} correct.`
    : run > 0
      ? 'Answer one question today to keep it going.'
      : days.size > 0
        ? 'Answer one question today to start a new streak.'
        : 'Answer one question to start a streak.';

  return (
    <section className="tile streak" aria-labelledby="streak-title">
      <h2 id="streak-title" className="label">
        Streak
      </h2>
      <p className="streak-figure">
        <Icon name="fire" size={32} filled={doneToday} />
        <span className="display">{run}</span>
        <span>{run === 1 ? 'day' : 'days'}</span>
      </p>
      <p className="muted">{status}</p>

      <div className="heat" role="img" aria-label={`Answers per day. You studied on ${days.size} ${days.size === 1 ? 'day' : 'days'} so far.`}>
        {weeks.map((week, i) => {
          const first = week.find((d) => d.day.endsWith('-01'));
          return (
            <div className="heat-week" key={week[0].day}>
              {/* A month's name sits over the week that holds its 1st. The last weeks skip it: it would run off the card. */}
              <span className="heat-month">
                {first && i < weeks.length - 2 ? parseDay(first.day).toLocaleDateString(undefined, { month: 'short' }) : ''}
              </span>
              {week.map((d) => (
                <span key={d.day} className="heat-day" data-level={d.level} title={dayTitle(d)} />
              ))}
            </div>
          );
        })}
      </div>
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
