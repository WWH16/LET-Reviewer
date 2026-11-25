// Sample answers, so Stats and the streak can be seen full before any real studying.
// Pure: the same questions and date always give the same answers.

import { addDays, dayKey, parseDay } from './dates';
import type { Attempt, Key, Mode, Question } from './types';

/** Every sample answer's id starts with this, so removing them never touches a real answer. */
export const DEMO_PREFIX = 'demo-';

const DAYS = 42;
const STREAK = 6;
const PER_DAY = [6, 10, 10, 14, 20, 28, 45];
const MODES: Mode[] = ['quiz', 'quiz', 'quiz', 'review'];
/** How far each question sits from its part's average, so some subjects come out weak and some strong. */
const SPREAD = [-0.34, -0.14, 0, 0.08, 0.14, 0.18];
const PART_SKILL: Record<string, number> = { GenEd: 0.7, ProfEd: 0.8, Major: 0.74 };

/** A small seeded generator (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Six weeks of answers ending now: days off early on, a streak into today, scores that rise over time. */
export function demoAttempts(questions: readonly Question[], now: Date): Attempt[] {
  const qs = questions.filter((q) => !q.deleted && q.answer !== null && q.choices.length > 1);
  if (!qs.length) return [];
  const rand = seeded(7);
  const today = dayKey(now);
  const out: Attempt[] = [];
  let next = 0;
  for (let d = DAYS - 1; d >= 0; d--) {
    if (d >= STREAK && rand() < 0.3) continue;
    const n = d === 0 ? 12 : PER_DAY[Math.floor(rand() * PER_DAY.length)];
    // Past days are answered in the evening; today's answers end at this moment, never after it.
    const start = d === 0 ? now.getTime() - n * 50_000 : parseDay(addDays(today, -d)).getTime() + 7 * 3_600_000;
    for (let i = 0; i < n; i++) {
      const at = next++;
      const q = qs[at % qs.length];
      const skill = (PART_SKILL[q.area] ?? 0.7) + SPREAD[(at % qs.length) % SPREAD.length] + (0.5 - d / DAYS) * 0.16;
      const wrong = q.choices.filter((c) => c.key !== q.answer);
      const chosen: Key = rand() < skill ? q.answer! : wrong[Math.floor(rand() * wrong.length)].key;
      out.push({
        id: `${DEMO_PREFIX}${at}`,
        questionId: q.id,
        chosen,
        ms: 20_000 + Math.floor(rand() * 50_000),
        mode: MODES[Math.floor(rand() * MODES.length)],
        at: new Date(start + i * 50_000).toISOString(),
      });
    }
  }
  return out;
}
