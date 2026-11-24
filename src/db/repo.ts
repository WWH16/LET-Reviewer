// Reads and writes. Screens call these instead of touching tables directly.

import { db } from './db';
import { previewImport } from '../domain/validate';
import { isCorrect } from '../domain/leitner';
import { originalKey } from '../domain/choices';
import { DEFAULT_SETTINGS, type Attempt, type Key, type MockExam, type Question, type Settings } from '../domain/types';
import sample from '../domain/sample-questions.json';
import { DEMO_PREFIX, demoAttempts } from '../domain/demo';

export const nowIso = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

// ---------- Meta (device-only) ----------

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}
export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('settings');
  // Settings saved before the welcome screen existed belong to someone already using the app: skip it for them.
  return { ...DEFAULT_SETTINGS, ...(stored && { onboarded: true }), ...stored };
}
export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'settings', updatedAt: nowIso(), deleted: false });
}

// ---------- Questions ----------

/** IDs that block an import. Removed items can be imported again. */
export async function liveQuestionIds(): Promise<Set<string>> {
  const all = await db.questions.toArray();
  return new Set(all.filter((q) => !q.deleted).map((q) => q.id));
}

/**
 * Adds new questions. An ID already in the bank is skipped, so a corrected key is never
 * overwritten. A removed, unedited item comes back.
 */
export async function importQuestions(list: Question[]): Promise<number> {
  return db.transaction('rw', db.questions, async () => {
    const existing = await db.questions.bulkGet(list.map((q) => q.id));
    const fresh = list.filter((_, i) => !existing[i] || (existing[i]!.deleted && !existing[i]!.edited));
    await db.questions.bulkPut(fresh);
    return fresh.length;
  });
}

export async function loadSampleQuestions(): Promise<number> {
  const p = previewImport(sample, await liveQuestionIds(), { now: nowIso(), batchId: 'sample' });
  return importQuestions(p.ready);
}

export async function saveQuestion(q: Question) {
  await db.questions.put({ ...q, edited: true, updatedAt: nowIso() });
}

export async function setFlag(id: string, reason: string | null) {
  await db.questions.update(id, { flag: reason ? { reason, at: nowIso() } : null, updatedAt: nowIso() });
}

export async function removeQuestion(id: string) {
  await db.questions.update(id, { deleted: true, updatedAt: nowIso() });
}

/** Brings soft-deleted questions back (the Undo on a remove). */
export async function restoreQuestions(ids: string[]) {
  const now = nowIso();
  await db.questions.where('id').anyOf(ids).modify((q) => {
    q.deleted = false;
    q.updatedAt = now;
  });
}

/** Soft-deletes a whole import batch (DX R4). Attempts stay, so history is not lost. */
export async function removeBatch(batchId: string): Promise<number> {
  const now = nowIso();
  return db.questions.where('importBatchId').equals(batchId).modify((q) => {
    q.deleted = true;
    q.updatedAt = now;
  });
}

// ---------- Attempts ----------

export async function recordAttempt(a: Omit<Attempt, 'id' | 'at'>): Promise<Attempt> {
  const full: Attempt = { ...a, id: uuid(), at: nowIso() };
  await db.attempts.add(full);
  return full;
}

// ---------- Mock exams ----------

export async function saveExam(e: MockExam) {
  await db.mockExams.put({ ...e, updatedAt: nowIso() });
}

export async function updateExam(id: string, patch: Partial<MockExam>) {
  await db.mockExams.update(id, { ...patch, updatedAt: nowIso() });
}

/** Saves one answer at once, so a dead battery loses nothing (plan §8.2). `undefined` clears it. */
export async function answerExam(id: string, n: number, key: Key | null | undefined, elapsedMs?: number) {
  await db.mockExams
    .where('id')
    .equals(id)
    .modify((e) => {
      if (key === undefined) delete e.answers[String(n)];
      else e.answers[String(n)] = key;
      if (elapsedMs !== undefined) e.answeredAt[String(n)] = elapsedMs;
      e.updatedAt = nowIso();
    });
}

export async function toggleExamFlag(id: string, n: number) {
  await db.mockExams
    .where('id')
    .equals(id)
    .modify((e) => {
      e.flags = e.flags.includes(n) ? e.flags.filter((x) => x !== n) : [...e.flags, n].sort((a, b) => a - b);
      e.updatedAt = nowIso();
    });
}

/** Writes one attempt per item and marks the exam graded (plan §8.5). */
export async function gradeExam(exam: MockExam): Promise<{ correct: number; total: number }> {
  const qs = await db.questions.bulkGet(exam.itemIds);
  const at = nowIso();
  const mode = exam.form === 'digital' ? 'mock-digital' : 'mock-printed';
  const attempts: Attempt[] = exam.itemIds.map((questionId, i) => {
    // The exam saves the letters she saw; the answer is kept as the question's own key.
    const letter = exam.answers[String(i + 1)] ?? null;
    return { id: uuid(), questionId, chosen: letter && originalKey(exam.orders?.[i], letter), ms: null, mode, at, examId: exam.id };
  });
  const correct = attempts.filter((a, i) => isCorrect(a, qs[i])).length;
  await db.transaction('rw', db.attempts, db.mockExams, async () => {
    // Grading is idempotent: a second Submit or Grade (a double tap, a time-up racing a tap) adds nothing.
    if ((await db.mockExams.get(exam.id))?.status === 'graded') return;
    await db.attempts.bulkAdd(attempts);
    await db.mockExams.update(exam.id, { status: 'graded', submittedAt: at, updatedAt: at });
  });
  return { correct, total: attempts.length };
}

// ---------- Device storage ----------

/** Asks the browser not to evict this site's data (DX R10). */
export async function protectStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const already = await navigator.storage.persisted();
  return already || navigator.storage.persist();
}

// ---------- Sample answers ----------

/** Fills the app with six weeks of sample answers (and the sample questions, if the bank is empty). */
export async function loadDemoData(): Promise<number> {
  if (!(await liveQuestionIds()).size) await loadSampleQuestions();
  const list = demoAttempts(await db.questions.toArray(), new Date());
  await db.transaction('rw', db.attempts, async () => {
    await db.attempts.where('id').startsWith(DEMO_PREFIX).delete();
    await db.attempts.bulkAdd(list);
  });
  return list.length;
}

/** Removes the sample answers only. Real answers stay. */
export const clearDemoData = () => db.attempts.where('id').startsWith(DEMO_PREFIX).delete();
