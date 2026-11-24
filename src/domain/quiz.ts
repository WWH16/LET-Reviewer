// Quizzes: every question belongs to one, on one part and one subject. A quiz has no record of its own;
// its subject, size and date come from its questions, so it syncs and backs up with them.

import { hash } from './ids';
import type { Question } from './types';

/** A new quiz's id. The time in it sorts quizzes by when they were made. */
export const newQuizId = (now: string) => `quiz-${now}`;

/** A question's id inside its quiz, so the same question in two quizzes stays two questions. */
export const quizQuestionId = (quizId: string, stem: string) => `${quizId}~${hash(stem.toLowerCase().replace(/\s+/g, ' ').trim())}`;

/** The quiz an import batch becomes, one per subject: `batch-<time>` keeps its time, anything else its name. */
export const batchQuizId = (batchId: string, subarea: string) =>
  `quiz-${batchId.startsWith('batch-') ? batchId.slice(6) : batchId}~${subarea}`;

/**
 * Brings a question saved before quizzes up to date. Runs on the device upgrade, on old backups and on
 * rows pulled from a device that has not updated yet, so it only reads the question itself.
 */
export function upgradeQuestion(q: Question): Question {
  if (q.quizId) return q;
  return { ...q, quizId: batchQuizId(q.importBatchId ?? 'imported', q.subarea) };
}
