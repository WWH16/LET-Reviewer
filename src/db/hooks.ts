// Live queries: a screen using these re-renders whenever the data changes.
// Each returns `undefined` while the first read is in flight.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getMeta, getSettings } from './repo';
import type { MockExam, Question } from '../domain/types';

export const useQuestions = () => useLiveQuery(async () => (await db.questions.toArray()).filter((q) => !q.deleted));

/** All questions by id, including removed ones, so old attempts still resolve. */
export const useQuestionMap = () =>
  useLiveQuery(async () => new Map((await db.questions.toArray()).map((q): [string, Question] => [q.id, q])));

/**
 * One exam's questions by id, read by key instead of loading the whole bank.
 * `undefined` while loading, `null` when there is no exam.
 */
export const useExamQuestions = (exam: MockExam | undefined) =>
  useLiveQuery(async () => {
    if (!exam) return null;
    const qs = await db.questions.bulkGet(exam.itemIds);
    return new Map(qs.filter((q) => !!q).map((q): [string, Question] => [q.id, q]));
  }, [exam?.id]);

/** Oldest first, straight off the `at` index, so nothing downstream has to sort. */
export const useAttempts = () => useLiveQuery(() => db.attempts.orderBy('at').toArray());

export const useSettings = () => useLiveQuery(getSettings);

export const useExams = () =>
  useLiveQuery(async () => (await db.mockExams.orderBy('createdAt').reverse().toArray()).filter((e) => !e.deleted));

export const useExam = (id: string | undefined) => useLiveQuery(() => (id ? db.mockExams.get(id) : undefined), [id]);

export const useMeta = <T>(key: string, fallback: T) => useLiveQuery(() => getMeta(key, fallback), [key]);
