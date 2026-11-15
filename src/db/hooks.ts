// Live queries: a screen using these re-renders whenever the data changes.
// Each returns `undefined` while the first read is in flight.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { DEFAULT_SETTINGS, type Question } from '../domain/types';

export const useQuestions = () => useLiveQuery(async () => (await db.questions.toArray()).filter((q) => !q.deleted));

/** All questions by id, including removed ones, so old attempts still resolve. */
export const useQuestionMap = () =>
  useLiveQuery(async () => new Map((await db.questions.toArray()).map((q): [string, Question] => [q.id, q])));

export const useAttempts = () => useLiveQuery(() => db.attempts.toArray());

export const useSettings = () => useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) }));

export const useExams = () =>
  useLiveQuery(async () => (await db.mockExams.orderBy('createdAt').reverse().toArray()).filter((e) => !e.deleted));

export const useExam = (id: string | undefined) => useLiveQuery(() => (id ? db.mockExams.get(id) : undefined), [id]);

export const useMeta = <T>(key: string, fallback: T) =>
  useLiveQuery(async () => {
    const row = await db.meta.get(key);
    return row ? (row.value as T) : fallback;
  }, [key]);
