// What sync does with records, with no network and no database: which pulled rows the device takes,
// and which local records go up. The newest `updatedAt` wins; answers are only ever added.

import { DEMO_PREFIX } from '../domain/demo';
import type { Attempt, MockExam, Question, Settings } from '../domain/types';

export type Collection = 'questions' | 'attempts' | 'mockExams' | 'settings';

/** A row as pulled. `updated_at` is the server's clock; the record's own `updatedAt` is a device's. */
export interface Row {
  collection: Collection;
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}
/** A row to push: the server fills in the owner and `updated_at`. */
export type PushRow = Omit<Row, 'updated_at'>;

export interface Records {
  questions: Question[];
  mockExams: MockExam[];
  settings: Settings | null;
  attempts: Attempt[];
}

/** What the device holds, as far as merging needs: `updatedAt` by id, and which answers exist. */
export interface LocalIndex {
  questions: Map<string, string>;
  mockExams: Map<string, string>;
  settingsUpdatedAt: string | null;
  attemptIds: Set<string>;
}

const usable = (data: unknown): data is { id: string; updatedAt?: string } =>
  typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string';

/** The pulled records the device should write. ISO timestamps compare correctly as strings. */
export function applyPulled(rows: readonly Row[], local: LocalIndex): Records {
  const questions = new Map<string, Question>();
  const mockExams = new Map<string, MockExam>();
  const attempts = new Map<string, Attempt>();
  let settings: Settings | null = null;
  // A later row for the same record in this batch is compared with the earlier one, not only with the device.
  const seen = { questions: new Map(local.questions), mockExams: new Map(local.mockExams), settings: local.settingsUpdatedAt };
  const newer = (mine: string | null | undefined, theirs: string | undefined) => !!theirs && (!mine || theirs > mine);

  for (const row of rows) {
    const data = row.data;
    if (!usable(data)) continue;
    if (row.collection === 'attempts') {
      if (!local.attemptIds.has(data.id)) attempts.set(data.id, data as Attempt);
    } else if (row.collection === 'settings') {
      if (newer(seen.settings, data.updatedAt)) {
        settings = data as Settings;
        seen.settings = data.updatedAt!;
      }
    } else if (row.collection !== 'questions' && row.collection !== 'mockExams') {
      continue; // a collection this version does not know: left on the server, never guessed at
    } else if (newer(seen[row.collection].get(data.id), data.updatedAt)) {
      seen[row.collection].set(data.id, data.updatedAt!);
      if (row.collection === 'questions') questions.set(data.id, data as Question);
      else mockExams.set(data.id, data as MockExam);
    }
  }
  return { questions: [...questions.values()], mockExams: [...mockExams.values()], settings, attempts: [...attempts.values()] };
}

/** Local records changed after `since`, as rows. Sample answers stay on the device. */
export function toPush(all: Records, since: string): PushRow[] {
  const changed = <T extends { id: string; updatedAt: string; deleted: boolean }>(collection: Collection, list: readonly T[]): PushRow[] =>
    list.filter((r) => r.updatedAt > since).map((r) => ({ collection, id: r.id, data: r, deleted: r.deleted }));
  return [
    ...changed('questions', all.questions),
    ...changed('mockExams', all.mockExams),
    ...(all.settings ? changed('settings', [all.settings]) : []),
    ...all.attempts
      .filter((a) => a.at > since && !a.id.startsWith(DEMO_PREFIX))
      .map((a): PushRow => ({ collection: 'attempts', id: a.id, data: a, deleted: false })),
  ];
}
