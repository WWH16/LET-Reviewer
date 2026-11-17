// One sync: pull what is new, then push what changed. Written against two small interfaces, so it is
// tested with no network and no IndexedDB. Every write is an upsert by id, so a run that stops halfway
// is finished by the next one.

import { applyPulled, toPush, type LocalIndex, type PushRow, type Records, type Row } from './merge';
import type { SyncState } from './trigger';

export interface Remote {
  /** Rows after (updated_at, id), ordered by updated_at then id, at most `limit`. */
  pull(after: { at: string; id: string }, limit: number): Promise<Row[]>;
  push(rows: PushRow[]): Promise<void>;
}

export interface Store {
  getState(): Promise<SyncState>;
  setState(patch: Partial<SyncState>): Promise<void>;
  index(): Promise<LocalIndex>;
  write(records: Records): Promise<void>;
  all(): Promise<Records>;
  /** Empties the four synced tables. Device-only values stay. */
  clear(): Promise<void>;
}

export const PAGE = 1000;
export const BATCH = 500;

/** Pull then push for `userId`. Never throws: a failure is recorded in `lastError`. True on success. */
export async function runSync(remote: Remote, store: Store, userId: string, now: () => string = () => new Date().toISOString()): Promise<boolean> {
  try {
    const state = await store.getState();
    // Data that last synced as someone else is never uploaded to this account. Sign-in asks first.
    if (state.userId && state.userId !== userId) throw new Error('This device holds another account’s data.');
    if (!state.userId) await store.setState({ userId });

    let after = { at: state.pulledAt, id: state.pulledId };
    for (;;) {
      const rows = await remote.pull(after, PAGE);
      if (!rows.length) break;
      await store.write(applyPulled(rows, await store.index()));
      const last = rows[rows.length - 1];
      after = { at: last.updated_at, id: last.id };
      await store.setState({ pulledAt: after.at, pulledId: after.id });
      if (rows.length < PAGE) break;
    }

    // ponytail: each pushed row comes back once on the next pull (the server restamps it) and is
    // dropped as a tie. Track pushed ids to skip the echo if a first upload ever gets large enough to matter.
    const pushStart = now();
    const rows = toPush(await store.all(), state.pushedAt);
    for (let i = 0; i < rows.length; i += BATCH) await remote.push(rows.slice(i, i + BATCH));
    await store.setState({ pushedAt: pushStart, lastSyncAt: now(), lastError: null });
    return true;
  } catch (e) {
    await store.setState({ lastError: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
