import { describe, expect, it } from 'vitest';
import { BATCH, PAGE, runSync, type Remote, type Store } from './run';
import { EMPTY_STATE, EPOCH, type SyncState } from './trigger';
import type { LocalIndex, PushRow, Records, Row } from './merge';
import type { Attempt, Question } from '../domain/types';

const q = (id: string, updatedAt: string) => ({ id, updatedAt, deleted: false, stem: id }) as Question;
const att = (id: string, at: string) => ({ id, at, questionId: 'q', chosen: 'A', ms: 1, mode: 'quick' }) as Attempt;
const stamp = (n: number) => new Date(Date.UTC(2026, 10, 17) + n * 1000).toISOString();

/** A server in memory: stamps each pushed row with a rising time, as the trigger does. */
function fakeRemote(seed: Row[] = []) {
  const rows = new Map<string, Row>(seed.map((r) => [`${r.collection}/${r.id}`, r]));
  let clock = 100_000;
  const calls = { pull: 0, push: [] as number[] };
  let failPush = 0;
  const remote: Remote = {
    async pull(after, limit) {
      calls.pull++;
      return [...rows.values()]
        .filter((r) => r.updated_at > after.at || (r.updated_at === after.at && r.id > after.id))
        .sort((a, b) => (a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : a.id < b.id ? -1 : 1))
        .slice(0, limit);
    },
    async push(batch: PushRow[]) {
      if (failPush-- > 0) throw new Error('network down');
      calls.push.push(batch.length);
      for (const r of batch) rows.set(`${r.collection}/${r.id}`, { ...r, updated_at: stamp(clock++) });
    },
  };
  return { remote, rows, calls, failNextPush: (n = 1) => (failPush = n) };
}

function fakeStore(initial: Partial<Records> = {}, state: Partial<SyncState> = {}) {
  const data: Records = { questions: [], mockExams: [], settings: null, attempts: [], ...initial };
  let s: SyncState = { ...EMPTY_STATE, ...state };
  const writes: Records[] = [];
  const store: Store = {
    getState: async () => s,
    setState: async (patch) => void (s = { ...s, ...patch }),
    index: async (): Promise<LocalIndex> => ({
      questions: new Map(data.questions.map((x) => [x.id, x.updatedAt])),
      mockExams: new Map(data.mockExams.map((x) => [x.id, x.updatedAt])),
      settingsUpdatedAt: data.settings?.updatedAt ?? null,
      attemptIds: new Set(data.attempts.map((a) => a.id)),
    }),
    write: async (r) => {
      writes.push(r);
      for (const x of r.questions) data.questions = [...data.questions.filter((y) => y.id !== x.id), x];
      for (const x of r.mockExams) data.mockExams = [...data.mockExams.filter((y) => y.id !== x.id), x];
      if (r.settings) data.settings = r.settings;
      data.attempts.push(...r.attempts);
    },
    all: async () => data,
    clear: async () => void (data.questions = data.mockExams = data.attempts = []),
  };
  return { store, data, writes, state: () => s };
}

const remoteRow = (id: string, n: number): Row => ({ collection: 'questions', id, data: q(id, stamp(n)), deleted: false, updated_at: stamp(n) });
const now = () => stamp(500_000);

describe('runSync', () => {
  it('pulls then pushes and moves both cursors', async () => {
    const r = fakeRemote([remoteRow('remote', 1)]);
    const s = fakeStore({ questions: [q('local', stamp(2))] });
    expect(await runSync(r.remote, s.store, 'A', now)).toBe(true);
    expect(s.data.questions.map((x) => x.id).sort()).toEqual(['local', 'remote']);
    expect([...r.rows.keys()].sort()).toEqual(['questions/local', 'questions/remote']);
    expect(s.state()).toMatchObject({ userId: 'A', pulledAt: stamp(1), pulledId: 'remote', pushedAt: now(), lastSyncAt: now(), lastError: null });
  });

  it('pages through more than one page', async () => {
    const r = fakeRemote(Array.from({ length: 2500 }, (_, i) => remoteRow(`q${String(i).padStart(4, '0')}`, i)));
    const s = fakeStore();
    await runSync(r.remote, s.store, 'A', now);
    expect(s.data.questions).toHaveLength(2500);
    expect(r.calls.pull).toBe(3);
  });

  it('does not skip rows sharing updated_at across a page edge', async () => {
    const seed = Array.from({ length: PAGE + 2 }, (_, i) => remoteRow(`q${String(i).padStart(4, '0')}`, i >= PAGE - 2 ? PAGE : i));
    const r = fakeRemote(seed);
    const s = fakeStore();
    await runSync(r.remote, s.store, 'A', now);
    expect(s.data.questions).toHaveLength(PAGE + 2);
  });

  it('pushes in batches of 500', async () => {
    const r = fakeRemote();
    const s = fakeStore({ attempts: Array.from({ length: 1200 }, (_, i) => att(`a${i}`, stamp(i + 1))) });
    await runSync(r.remote, s.store, 'A', now);
    expect(BATCH).toBe(500);
    expect(r.calls.push).toEqual([500, 500, 200]);
  });

  it('leaves the push cursor unchanged when push fails', async () => {
    const r = fakeRemote([remoteRow('remote', 1)]);
    const s = fakeStore({ questions: [q('local', stamp(2))] });
    r.failNextPush();
    expect(await runSync(r.remote, s.store, 'A', now)).toBe(false);
    expect(s.state()).toMatchObject({ pushedAt: EPOCH, pulledAt: stamp(1), lastSyncAt: null });
    expect(s.state().lastError).toMatch(/network down/);
  });

  it('finishes an interrupted run on the next call', async () => {
    const r = fakeRemote();
    const s = fakeStore({ attempts: Array.from({ length: 700 }, (_, i) => att(`a${i}`, stamp(i + 1))) });
    r.failNextPush();
    await runSync(r.remote, s.store, 'A', now);
    expect(await runSync(r.remote, s.store, 'A', now)).toBe(true);
    expect(r.rows.size).toBe(700);
    expect(s.data.attempts).toHaveLength(700);
  });

  it('refuses to run for a different account', async () => {
    const r = fakeRemote();
    const s = fakeStore({ questions: [q('theirs', stamp(2))] }, { userId: 'A' });
    expect(await runSync(r.remote, s.store, 'B', now)).toBe(false);
    expect(r.calls).toEqual({ pull: 0, push: [] });
    expect(s.state().lastError).toBeTruthy();
    expect(s.state().userId).toBe('A');
  });

  it('adopts the account when the device has none', async () => {
    const s = fakeStore();
    await runSync(fakeRemote().remote, s.store, 'B', now);
    expect(s.state().userId).toBe('B');
  });

  it('running twice changes nothing the second time', async () => {
    const r = fakeRemote([remoteRow('remote', 1)]);
    const s = fakeStore({ questions: [q('local', stamp(2))] });
    await runSync(r.remote, s.store, 'A', now);
    const pushes = r.calls.push.length;
    const size = s.data.questions.length;
    await runSync(r.remote, s.store, 'A', () => stamp(600_000));
    expect(s.data.questions).toHaveLength(size);
    expect(r.calls.push.length).toBe(pushes);
  });
});
