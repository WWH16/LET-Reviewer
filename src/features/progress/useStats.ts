import { useMemo } from 'react';
import { useAttempts, useQuestionMap, useSettings } from '../../db/hooks';
import { buildCards, dueCards, isCorrect } from '../../domain/leitner';
import { projectedRating, recentPartScores } from '../../domain/scoring';
import { dayKey } from '../../domain/dates';

export const MIN_PART_ANSWERS = 20;

/** Everything Home and Progress derive from attempts. Recomputed when data changes. */
export function useStats() {
  const qmap = useQuestionMap();
  const attempts = useAttempts();
  const settings = useSettings();
  return useMemo(() => {
    if (!qmap || !attempts || !settings) return undefined;
    const today = dayKey(new Date());
    const cards = buildCards(attempts, qmap);
    const due = dueCards(cards, today).filter((c) => {
      const q = qmap.get(c.questionId);
      return q && !q.deleted;
    });
    const parts = recentPartScores(attempts, qmap);
    // A part with too few answers would swing the rating and trigger false floor warnings.
    const rating = projectedRating(
      settings.level,
      Object.fromEntries(Object.entries(parts).map(([a, v]) => [a, v!.total >= MIN_PART_ANSWERS ? v!.pct : null])),
    );
    // Answers per study day: the streak reads its keys, the activity grid its counts.
    const days = new Map<string, number>();
    const todayAttempts: typeof attempts = [];
    for (const a of attempts) {
      const day = dayKey(a.at);
      days.set(day, (days.get(day) ?? 0) + 1);
      if (day === today) todayAttempts.push(a);
    }
    const todayCorrect = todayAttempts.filter((a) => isCorrect(a, qmap.get(a.questionId))).length;
    let hasQuestions = false;
    for (const q of qmap.values()) {
      if (!q.deleted) {
        hasQuestions = true;
        break;
      }
    }
    return { qmap, attempts, settings, today, cards, due, parts, rating, days, todayAttempts, todayCorrect, hasQuestions };
  }, [qmap, attempts, settings]);
}
