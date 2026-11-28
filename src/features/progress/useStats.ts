import { useMemo } from 'react';
import { useAttempts, useQuestionMap, useSettings } from '../../db/hooks';
import { isCorrect, projectedRating, recentPartScores } from '../../domain/scoring';
import { dayKey, studyDays } from '../../domain/dates';

export const MIN_PART_ANSWERS = 20;

/** Everything Home and Progress derive from attempts. Recomputed when data changes. */
export function useStats() {
  const qmap = useQuestionMap();
  const attempts = useAttempts();
  const settings = useSettings();
  return useMemo(() => {
    if (!qmap || !attempts || !settings) return undefined;
    const today = dayKey(new Date());
    const parts = recentPartScores(attempts, qmap);
    // A part with too few answers would swing the rating and trigger false floor warnings.
    const rating = projectedRating(
      settings.level,
      Object.fromEntries(Object.entries(parts).map(([a, v]) => [a, v!.total >= MIN_PART_ANSWERS ? v!.pct : null])),
    );
    // Answers per study day (blank mock items left out): the streak reads its keys, the activity grid its counts.
    const { days, today: todayAttempts } = studyDays(attempts, today);
    const todayCorrect = todayAttempts.filter((a) => isCorrect(a, qmap.get(a.questionId))).length;
    const hasQuestions = [...qmap.values()].some((q) => !q.deleted);
    return { qmap, attempts, settings, today, parts, rating, days, todayAttempts, todayCorrect, hasQuestions };
  }, [qmap, attempts, settings]);
}
