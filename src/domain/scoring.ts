// Accuracy and the projected LET rating (plan §3, §6.6, §8.4).

import { isCorrect } from './leitner';
import { LEVEL_WEIGHTS, PART_FLOOR, PASSING_AVERAGE, subareaName } from './let-config';
import type { Area, Attempt, Level, Question } from './types';

export interface Tally {
  correct: number;
  total: number;
}

export const pct = (t: Tally | undefined): number | null => (t && t.total ? (t.correct / t.total) * 100 : null);

export function tallyBy(
  attempts: readonly Attempt[],
  questions: ReadonlyMap<string, Question>,
  keyOf: (q: Question) => string,
): Map<string, Tally> {
  const out = new Map<string, Tally>();
  for (const a of attempts) {
    const q = questions.get(a.questionId);
    const ok = isCorrect(a, q);
    if (ok === null || !q) continue;
    const k = keyOf(q);
    const t = out.get(k) ?? { correct: 0, total: 0 };
    t.total++;
    if (ok) t.correct++;
    out.set(k, t);
  }
  return out;
}

// ponytail: the rating uses each part's most recent 150 scored answers (one exam's worth),
// so it tracks current ability. Weight mock answers more if practice scores run high.
const RECENT = 150;

export function recentPartScores(attempts: readonly Attempt[], questions: ReadonlyMap<string, Question>) {
  const byArea = new Map<Area, Attempt[]>();
  const sorted = [...attempts].sort((a, b) => b.at.localeCompare(a.at));
  for (const a of sorted) {
    const q = questions.get(a.questionId);
    if (!q || isCorrect(a, q) === null) continue;
    const list = byArea.get(q.area) ?? [];
    if (list.length < RECENT) list.push(a);
    byArea.set(q.area, list);
  }
  const out: Partial<Record<Area, { pct: number; total: number }>> = {};
  for (const [area, list] of byArea) {
    const t = tallyBy(list, questions, () => area).get(area)!;
    out[area] = { pct: pct(t)!, total: t.total };
  }
  return out;
}

export interface Rating {
  /** Weighted average, or null if a part has no data yet. */
  rating: number | null;
  missing: Area[];
  belowFloor: Area[];
  /** Within 5 points of the 50% floor. */
  nearFloor: Area[];
  passes: boolean | null;
}

export function projectedRating(level: Level, parts: Partial<Record<Area, number | null>>): Rating {
  const weights = LEVEL_WEIGHTS[level];
  const missing: Area[] = [];
  const belowFloor: Area[] = [];
  const nearFloor: Area[] = [];
  let sum = 0;
  for (const [area, w] of Object.entries(weights) as [Area, number][]) {
    const p = parts[area];
    if (p === null || p === undefined) {
      missing.push(area);
      continue;
    }
    sum += p * w;
    if (p < PART_FLOOR) belowFloor.push(area);
    else if (p < PART_FLOOR + 5) nearFloor.push(area);
  }
  const rating = missing.length ? null : sum;
  return {
    rating,
    missing,
    belowFloor,
    nearFloor,
    passes: rating === null ? null : rating >= PASSING_AVERAGE && belowFloor.length === 0,
  };
}

export interface WeakTopic {
  subarea: string;
  topic: string;
  area: Area;
  tally: Tally;
}

export function weakestTopics(
  attempts: readonly Attempt[],
  questions: ReadonlyMap<string, Question>,
  n = 5,
  minAttempts = 3,
): WeakTopic[] {
  const meta = new Map<string, { area: Area; subarea: string; topic: string }>();
  const tallies = tallyBy(attempts, questions, (q) => {
    const k = `${q.subarea}\u0000${q.topic}`;
    meta.set(k, { area: q.area, subarea: q.subarea, topic: q.topic });
    return k;
  });
  return [...tallies]
    .filter(([, t]) => t.total >= minAttempts)
    .sort(([, a], [, b]) => pct(a)! - pct(b)! || b.total - a.total)
    .slice(0, n)
    .map(([k, tally]) => ({ ...meta.get(k)!, tally }));
}

export function weakTopicsText(list: readonly WeakTopic[]): string {
  return list
    .map((w) => {
      const name = w.topic ? `${subareaName(w.subarea)}, ${w.topic}` : subareaName(w.subarea);
      return `${name}: ${Math.round(pct(w.tally)!)}% over ${w.tally.total} attempts`;
    })
    .join('\n');
}
