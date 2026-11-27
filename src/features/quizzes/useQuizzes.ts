import { useMemo } from 'react';
import { useAttempts, useQuestionMap } from '../../db/hooks';
import { groupQuizzes } from '../../domain/quiz';
import { lastResults } from '../../domain/scoring';

/** Every quiz, plus each question's latest result, for the Quizzes screens. `undefined` while loading. */
export function useQuizzes() {
  const qmap = useQuestionMap();
  const attempts = useAttempts();
  return useMemo(() => {
    if (!qmap || !attempts) return undefined;
    return { quizzes: groupQuizzes(qmap.values()), last: lastResults(attempts, qmap), qmap };
  }, [qmap, attempts]);
}

/** "9 of 15 right last time", from each question's latest answer. Empty before the first take. */
export function lastLine(ids: readonly string[], last: ReadonlyMap<string, boolean>): string {
  const answered = ids.filter((id) => last.has(id));
  if (!answered.length) return 'Not taken yet';
  const right = answered.filter((id) => last.get(id)).length;
  return `${right} of ${ids.length} right on your last answers`;
}

/** "1 question", "3 questions". */
export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : word.endsWith('z') ? 'zes' : 's'}`;

