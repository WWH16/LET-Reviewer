// The sync run's view of the local database.

import { db } from '../db/db';
import { getMeta, setMeta } from '../db/repo';
import type { Settings } from '../domain/types';
import type { Store } from './run';
import { EMPTY_STATE, type SyncState } from './trigger';

const getState = () => getMeta<SyncState>('sync', EMPTY_STATE);

export const dexieStore: Store = {
  getState,
  setState: async (patch) => {
    await db.transaction('rw', db.meta, async () => void (await setMeta('sync', { ...(await getState()), ...patch })));
  },
  index: async () => {
    const [questions, mockExams, settings, attemptIds] = await Promise.all([
      db.questions.toArray(),
      db.mockExams.toArray(),
      db.settings.get('settings'),
      db.attempts.toCollection().primaryKeys(),
    ]);
    return {
      questions: new Map(questions.map((q) => [q.id, q.updatedAt])),
      mockExams: new Map(mockExams.map((e) => [e.id, e.updatedAt])),
      settingsUpdatedAt: settings?.updatedAt ?? null,
      attemptIds: new Set(attemptIds),
    };
  },
  write: async (r) => {
    if (!r.questions.length && !r.mockExams.length && !r.attempts.length && !r.settings) return;
    await db.transaction('rw', [db.questions, db.mockExams, db.attempts, db.settings], async () => {
      await db.questions.bulkPut(r.questions);
      await db.mockExams.bulkPut(r.mockExams);
      await db.attempts.bulkPut(r.attempts);
      if (r.settings) await db.settings.put({ ...r.settings, id: 'settings' } as Settings);
    });
  },
  all: async () => {
    const [questions, mockExams, settings, attempts] = await Promise.all([
      db.questions.toArray(),
      db.mockExams.toArray(),
      db.settings.get('settings'),
      db.attempts.toArray(),
    ]);
    return { questions, mockExams, settings: settings ?? null, attempts };
  },
  clear: async () => {
    await db.transaction('rw', [db.questions, db.mockExams, db.attempts, db.settings], () =>
      Promise.all([db.questions.clear(), db.mockExams.clear(), db.attempts.clear(), db.settings.clear()]),
    );
  },
};
