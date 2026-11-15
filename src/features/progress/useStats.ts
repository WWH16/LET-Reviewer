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
    const days = new Set(attempts.map((a) => dayKey(a.at)));
    const todayAttempts = attempts.filter((a) => dayKey(a.at) === today);
    const todayCorrect = todayAttempts.filter((a) => isCorrect(a, qmap.get(a.questionId))).length;
    return { qmap, attempts, settings, today, cards, due, parts, rating, days, todayAttempts, todayCorrect };
  }, [qmap, attempts, settings]);
}
