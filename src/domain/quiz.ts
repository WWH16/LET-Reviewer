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
  const batch = (q as Question & { importBatchId?: string }).importBatchId;
  return { ...q, quizId: batchQuizId(batch ?? 'imported', q.subarea) };
}

/** A question a quiz or mock can ask: not removed, and it has an answer key. */
export const counts = (q: Question) => !q.deleted && q.answer !== null;

export interface Quiz {
  id: string;
  area: Question['area'];
  subarea: string;
  /** Her topic the quiz was made for; absent for the whole subject. */
  topicId?: string;
  /** "Quiz 2": its place among the subject's quizzes, oldest first. */
  name: string;
  /** When it was made: from its id, or its oldest question for one with no time in its id. */
  createdAt: string;
  questions: Question[];
}

/** Every quiz with at least one question left, oldest first, named in order within each subject. */
export function groupQuizzes(questions: Iterable<Question>): Quiz[] {
  const byId = new Map<string, Question[]>();
  for (const q of questions) if (counts(q)) byId.set(q.quizId, [...(byId.get(q.quizId) ?? []), q]);
  const dated = [...byId].map(([id, qs]) => {
    const stamp = id.slice(5).split('~')[0];
    const createdAt = Number.isNaN(Date.parse(stamp)) ? qs.map((q) => q.updatedAt).sort()[0] : stamp;
    return { id, area: qs[0].area, subarea: qs[0].subarea, topicId: qs[0].topicId, name: '', createdAt, questions: qs };
  });
  dated.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const n = new Map<string, number>();
  for (const z of dated) {
    const k = `${z.area}/${z.subarea}`;
    n.set(k, (n.get(k) ?? 0) + 1);
    z.name = `Quiz ${n.get(k)}`;
  }
  return dated;
}
