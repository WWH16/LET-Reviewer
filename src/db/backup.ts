// Backup file: one versioned envelope (plan §4). Restore replaces, it does not merge.

import { db } from './db';
import { getSettings, nowIso, setMeta } from './repo';
import { SCHEMA_VERSION, settingsAfterErase, type Backup } from '../domain/types';
import { upgradeQuestion } from '../domain/quiz';

export async function exportBackup(): Promise<{ filename: string; text: string }> {
  const [questions, attempts, mockExams, settings] = await Promise.all([
    db.questions.toArray(),
    db.attempts.toArray(),
    db.mockExams.toArray(),
    db.settings.get('settings'),
  ]);
  const backup: Backup = {
    type: 'backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    questions,
    attempts,
    mockExams,
    settings: settings ?? null,
  };
  await setMeta('lastBackup', { at: backup.exportedAt, attempts: attempts.length });
  const day = backup.exportedAt.slice(0, 10);
  return { filename: `let-prep-backup-${day}.json`, text: JSON.stringify(backup) };
}

export interface Counts {
  questions: number;
  attempts: number;
}

export async function deviceCounts(): Promise<Counts> {
  const qs = await db.questions.toArray();
  return { questions: qs.filter((q) => !q.deleted).length, attempts: await db.attempts.count() };
}

/** Checks a parsed backup. Returns an error she can act on, or the counts for the preview. */
export function checkBackup(v: Record<string, unknown>): { ok: true; backup: Backup; counts: Counts } | { ok: false; error: string } {
  const version = Number(v.schemaVersion);
  if (!Number.isInteger(version) || version < 1)
    return { ok: false, error: 'This file has no schema version, so it is not a backup made by this app. Nothing was restored.' };
  if (version > SCHEMA_VERSION)
    return {
      ok: false,
      error: `This backup was made by a newer version (v${version}) than this app (v${SCHEMA_VERSION}). Nothing was restored. Reload the app to update, then try again.`,
    };
  if (!Array.isArray(v.questions) || !Array.isArray(v.attempts))
    return { ok: false, error: 'This backup is missing its questions or answers. Nothing was restored.' };
  const backup = { mockExams: [], settings: null, ...v } as unknown as Backup;
  // v1 questions have no quiz yet.
  backup.questions = backup.questions.map(upgradeQuestion);
  const questions = backup.questions.filter((q) => !q.deleted).length;
  return { ok: true, backup, counts: { questions, attempts: backup.attempts.length } };
}

export async function restoreBackup(b: Backup) {
  await db.transaction('rw', [db.questions, db.attempts, db.mockExams, db.settings], async () => {
    await Promise.all([db.questions.clear(), db.attempts.clear(), db.mockExams.clear(), db.settings.clear()]);
    await db.questions.bulkAdd(b.questions);
    await db.attempts.bulkAdd(b.attempts);
    await db.mockExams.bulkAdd(b.mockExams);
    if (b.settings) await db.settings.put(b.settings);
  });
}

/**
 * Erases everything this app keeps on this device: the whole database (questions, answers, mocks,
 * settings, sync position) and its local storage, which also holds the account sign-in. The caller
 * reloads, so the app starts over at the welcome screen. An account's copy online is not touched.
 */
/**
 * Erase this device: every quiz and question, answer, mock exam and subject, the settings, and the device-only
 * notes (unfinished quizzes, last backup). Kept: who she is (name, avatar, level and major, see settingsAfterErase)
 * and her sign-in with its sync place, so she lands on an empty Study, signed in, with no welcome and nothing
 * pulled back from her account.
 */
export async function eraseDevice() {
  const before = await getSettings();
  await db.transaction('rw', [db.questions, db.attempts, db.mockExams, db.settings, db.meta], async () => {
    await Promise.all([db.questions.clear(), db.attempts.clear(), db.mockExams.clear(), db.meta.where('key').notEqual('sync').delete()]);
    await db.settings.put(settingsAfterErase(before));
  });
}
