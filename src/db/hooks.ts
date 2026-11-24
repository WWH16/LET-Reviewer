// Live queries: a screen using these re-renders whenever the data changes.
// Each returns `undefined` while the first read is in flight.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getMeta, getSettings } from './repo';
import type { MockExam, Question } from '../domain/types';
import { DEMO_PREFIX } from '../domain/demo';
import { shown } from '../domain/choices';

export const useQuestions = () => useLiveQuery(async () => (await db.questions.toArray()).filter((q) => !q.deleted));

/** All questions by id, including removed ones, so old attempts still resolve. */
export const useQuestionMap = () =>
  useLiveQuery(async () => new Map((await db.questions.toArray()).map((q): [string, Question] => [q.id, q])));

/**
 * One exam's questions by id, as the exam shows them, read by key instead of loading the whole bank.
 * `undefined` while loading, `null` when there is no exam.
 */
export const useExamQuestions = (exam: MockExam | undefined) =>
  useLiveQuery(async () => {
    if (!exam) return null;
    const qs = await db.questions.bulkGet(exam.itemIds);
    // As shown in this exam: its own choice order, so answers are in the letters she saw.
    return new Map(qs.flatMap((q, i): [string, Question][] => (q ? [[q.id, shown(q, exam.orders?.[i])]] : [])));
  }, [exam?.id]);

/** Oldest first, straight off the `at` index, so nothing downstream has to sort. */
export const useAttempts = () => useLiveQuery(() => db.attempts.orderBy('at').toArray());

export const useSettings = () => useLiveQuery(getSettings);

export const useExams = () =>
  useLiveQuery(async () => (await db.mockExams.orderBy('createdAt').reverse().toArray()).filter((e) => !e.deleted));

export const useExam = (id: string | undefined) => useLiveQuery(() => (id ? db.mockExams.get(id) : undefined), [id]);

export const useMeta = <T>(key: string, fallback: T) => useLiveQuery(() => getMeta(key, fallback), [key]);

/** How many sample answers (Settings, Sample data) are on this device. */
export const useDemoCount = () => useLiveQuery(() => db.attempts.where('id').startsWith(DEMO_PREFIX).count());
