// A study "day" is the local calendar date with a 3 a.m. rollover (DX N3),
// so studying at 00:30 still counts as the same night.

const ROLLOVER_H = 3;

/** A Date as its local 'YYYY-MM-DD'. */
export const isoDay = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
/** 'YYYY-MM-DD' as local noon. `new Date(day)` reads it as UTC midnight, which can land a day off. */
export const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export function dayKey(d: Date | string): string {
  const t = new Date(d);
  t.setHours(t.getHours() - ROLLOVER_H);
  return isoDay(t);
}

export function addDays(day: string, n: number): string {
  const t = parseDay(day);
  t.setDate(t.getDate() + n);
  return isoDay(t);
}

export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
}

/** Consecutive study days ending today (or yesterday, so the streak survives until tonight). */
export function streak(days: { has(day: string): boolean }, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

// ponytail: fixed answer counts per shade. One 10-question quiz reaches level 2, a full mock level 4.
// Scale them to her own busiest day if the grid ends up all one shade.
export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export const heatLevel = (count: number): HeatLevel => (count <= 0 ? 0 : count < 10 ? 1 : count < 25 ? 2 : count < 50 ? 3 : 4);

export interface HeatDay {
  day: string;
  count: number;
  level: HeatLevel;
}

/**
 * The activity grid: `weeks` columns of days, Sunday first, oldest week first.
 * The last column is this week and stops at today, so it can be shorter than seven.
 */
export function heatWeeks(counts: { get(day: string): number | undefined }, today: string, weeks: number): HeatDay[][] {
  const weekday = parseDay(today).getDay();
  const out: HeatDay[][] = [];
  let day = addDays(today, -(weekday + 7 * (weeks - 1)));
  while (day <= today) {
    const week: HeatDay[] = [];
    for (let i = 0; i < 7 && day <= today; i++) {
      const count = counts.get(day) ?? 0;
      week.push({ day, count, level: heatLevel(count) });
      day = addDays(day, 1);
    }
    out.push(week);
  }
  return out;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
