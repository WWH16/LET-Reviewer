import { describe, expect, it } from 'vitest';
import { batchQuizId, newQuizId, quizQuestionId, upgradeQuestion } from './quiz';
import type { Question } from './types';

const old = (over: Partial<Question>) => ({ id: 'x', subarea: 'english', importBatchId: 'batch-2026-11-01T08:00:00.000Z', ...over }) as Question;

describe('quiz ids', () => {
  it('turns each import batch and subject into one quiz, keeping the batch time', () => {
    expect(upgradeQuestion(old({})).quizId).toBe('quiz-2026-11-01T08:00:00.000Z~english');
    expect(upgradeQuestion(old({ subarea: 'filipino' })).quizId).toBe('quiz-2026-11-01T08:00:00.000Z~filipino');
    expect(upgradeQuestion(old({ importBatchId: 'sample' })).quizId).toBe('quiz-sample~english');
  });
  it('leaves a question that already has a quiz alone', () => {
    const q = old({ quizId: 'quiz-a' });
    expect(upgradeQuestion(q)).toBe(q);
  });
  it('sorts new quizzes by time and keeps the same stem in two quizzes apart', () => {
    expect(newQuizId('2026-11-02T00:00:00.000Z') > batchQuizId('batch-2026-11-01T00:00:00.000Z', 'english')).toBe(true);
    expect(quizQuestionId('quiz-a', 'Same  stem')).toBe(quizQuestionId('quiz-a', 'same stem'));
    expect(quizQuestionId('quiz-a', 'Same stem')).not.toBe(quizQuestionId('quiz-b', 'Same stem'));
  });
});
