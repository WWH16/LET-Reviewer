// Accuracy and the projected LET rating (plan §3, §6.6, §8.4).

import { LEVEL_WEIGHTS, PART_FLOOR, PASSING_AVERAGE } from './let-config';
import { shown } from './choices';
import type { Area, Attempt, Level, MockExam, Question } from './types';

/** Item i of an exam as it was shown, with the exam's choice order. */
export const examItem = (e: MockExam, i: number, qmap: ReadonlyMap<string, Question>) => {
  const q = qmap.get(e.itemIds[i]);
  return q && shown(q, e.orders?.[i]);
};

export function examScore(e: MockExam, qmap: ReadonlyMap<string, Question>) {
  let correct = 0;
  e.itemIds.forEach((_, i) => {
    const q = examItem(e, i, qmap);
    if (q && q.answer !== null && e.answers[String(i + 1)] === q.answer) correct++;
  });
  return { correct, total: e.itemIds.length, pct: e.itemIds.length ? (correct / e.itemIds.length) * 100 : 0 };
}

/** `null` when the question has no key or is gone, so the attempt cannot be scored. */
export function isCorrect(a: Attempt, q: Question | undefined): boolean | null {
  if (!q || q.deleted || q.answer === null) return null;
  return a.chosen === q.answer;
}

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

/** Each question's latest graded answer: true if right, false if wrong. Unanswered questions are absent. */
export function lastResults(attempts: readonly Attempt[], questions: ReadonlyMap<string, Question>): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const at = new Map<string, string>();
  for (const a of attempts) {
    const ok = isCorrect(a, questions.get(a.questionId));
    if (ok === null) continue;
    const prev = at.get(a.questionId);
    if (prev === undefined || a.at >= prev) {
      at.set(a.questionId, a.at);
      out.set(a.questionId, ok);
    }
  }
  return out;
}

/** Each part's most recent 150 scored answers, newest first: the window the rating and Progress use. */
export function recentByArea(attempts: readonly Attempt[], questions: ReadonlyMap<string, Question>) {
  const byArea = new Map<Area, Attempt[]>();
  const sorted = [...attempts].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  for (const a of sorted) {
    const q = questions.get(a.questionId);
    if (!q || isCorrect(a, q) === null) continue;
    const list = byArea.get(q.area) ?? [];
    if (list.length < RECENT) list.push(a);
    byArea.set(q.area, list);
  }
  return byArea;
}

export function recentPartScores(attempts: readonly Attempt[], questions: ReadonlyMap<string, Question>) {
  const byArea = recentByArea(attempts, questions);
  const out: Partial<Record<Area, { pct: number; total: number }>> = {};
  for (const [area, list] of byArea) {
    const correct = list.filter((a) => isCorrect(a, questions.get(a.questionId))).length;
    out[area] = { pct: (correct / list.length) * 100, total: list.length };
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

export interface WeakSubject {
  area: Area;
  subarea: string;
  tally: Tally;
}

/** Her lowest-scoring subjects, each with at least `minAttempts` answers. */
export function weakestSubjects(
  attempts: readonly Attempt[],
  questions: ReadonlyMap<string, Question>,
  n = 5,
  minAttempts = 3,
): WeakSubject[] {
  const tallies = tallyBy(attempts, questions, (q) => `${q.area}/${q.subarea}`);
  return [...tallies]
    .filter(([, t]) => t.total >= minAttempts)
    .sort(([, a], [, b]) => pct(a)! - pct(b)! || b.total - a.total)
    .slice(0, n)
    .map(([k, tally]) => {
      const [area, subarea] = k.split('/') as [Area, string];
      return { area, subarea, tally };
    });
}
