// Local database (IndexedDB through Dexie). The source of truth: every screen reads and writes here.
// To change the schema, add a new `db.version(n)` below with an `.upgrade()`, and bump
// SCHEMA_VERSION in domain/types.ts so backups record which shape they hold.

import Dexie, { type EntityTable } from 'dexie';
import type { Attempt, MockExam, Question, Settings } from '../domain/types';

/** Device-only values (never synced): last backup, drill presets, storage status. */
export interface MetaRow {
  key: string;
  value: unknown;
}

export const db = new Dexie('let-reviewer') as Dexie & {
  questions: EntityTable<Question, 'id'>;
  attempts: EntityTable<Attempt, 'id'>;
  mockExams: EntityTable<MockExam, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  meta: EntityTable<MetaRow, 'key'>;
};

db.version(1).stores({
  questions: 'id, area, subarea, status, source, importBatchId, updatedAt',
  attempts: 'id, questionId, at, mode, examId',
  mockExams: 'id, status, createdAt, updatedAt',
  settings: 'id',
  meta: 'key',
});
