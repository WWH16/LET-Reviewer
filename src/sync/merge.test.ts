import { describe, expect, it } from 'vitest';
import { applyPulled, toPush, type LocalIndex, type Records, type Row } from './merge';
import { DEFAULT_SETTINGS, type Attempt, type MockExam, type Question } from '../domain/types';

const T = (h: string) => `2026-11-17T${h}:00.000Z`;
const question = (id: string, updatedAt: string, over: Partial<Question> = {}) => ({ id, updatedAt, deleted: false, stem: id, ...over }) as Question;
const exam = (id: string, updatedAt: string) => ({ id, updatedAt, deleted: false }) as MockExam;
const attempt = (id: string, at: string) => ({ id, at, questionId: 'q1', chosen: 'A', ms: null, mode: 'quick' }) as Attempt;
const row = (collection: Row['collection'], data: { id: string; deleted?: boolean }, updated_at = T('12:00')): Row => ({
  collection,
  id: data.id,
  data,
  deleted: !!data.deleted,
  updated_at,
});
const index = (over: Partial<LocalIndex> = {}): LocalIndex => ({ questions: new Map(), mockExams: new Map(), settingsUpdatedAt: null, attemptIds: new Set(), ...over });
const records = (over: Partial<Records> = {}): Records => ({ questions: [], mockExams: [], settings: null, attempts: [], ...over });

describe('applyPulled', () => {
  it('takes a pulled record the device does not have', () => {
    const out = applyPulled([row('questions', question('q1', T('10:00'))), row('mockExams', exam('e1', T('10:00')))], index());
    expect(out.questions.map((q) => q.id)).toEqual(['q1']);
    expect(out.mockExams.map((e) => e.id)).toEqual(['e1']);
  });
  it('takes a pulled record newer than the local one', () => {
    const out = applyPulled([row('questions', question('q1', T('11:00')))], index({ questions: new Map([['q1', T('10:00')]]) }));
    expect(out.questions).toHaveLength(1);
  });
  it('keeps the local record when it is newer', () => {
    const out = applyPulled([row('questions', question('q1', T('09:00')))], index({ questions: new Map([['q1', T('10:00')]]) }));
    expect(out.questions).toEqual([]);
  });
  it('keeps the local record on a tie', () => {
    const out = applyPulled([row('questions', question('q1', T('10:00')))], index({ questions: new Map([['q1', T('10:00')]]) }));
    expect(out.questions).toEqual([]);
  });
  it('carries a remote removal', () => {
    const out = applyPulled([row('questions', question('q1', T('11:00'), { deleted: true }))], index({ questions: new Map([['q1', T('10:00')]]) }));
    expect(out.questions[0].deleted).toBe(true);
  });
  it('adds only attempts the device lacks', () => {
    const out = applyPulled([row('attempts', attempt('a1', T('10:00'))), row('attempts', attempt('a2', T('10:01')))], index({ attemptIds: new Set(['a1']) }));
    expect(out.attempts.map((a) => a.id)).toEqual(['a2']);
  });
  it('takes newer settings and keeps newer local ones', () => {
    const remote = { ...DEFAULT_SETTINGS, name: 'Sam', updatedAt: T('11:00') };
    expect(applyPulled([row('settings', remote)], index({ settingsUpdatedAt: T('10:00') })).settings?.name).toBe('Sam');
    expect(applyPulled([row('settings', remote)], index({ settingsUpdatedAt: T('12:00') })).settings).toBeNull();
  });
  it('uses the newest when a record is pulled twice', () => {
    const out = applyPulled([row('questions', question('q1', T('10:00'), { stem: 'old' })), row('questions', question('q1', T('11:00'), { stem: 'new' }))], index());
    expect(out.questions.map((q) => q.stem)).toEqual(['new']);
  });
  it('ignores a row from an unknown collection or with no data', () => {
    const odd = [{ ...row('questions', question('q1', T('10:00'))), collection: 'cards' as Row['collection'] }, { ...row('questions', question('q2', T('10:00'))), data: null }];
    expect(applyPulled(odd, index())).toEqual(records());
  });
});

describe('toPush', () => {
  it('pushes only what changed after the cursor', () => {
    const all = records({ questions: [question('old', T('09:00')), question('same', T('10:00')), question('new', T('10:01'))] });
    expect(toPush(all, T('10:00')).map((r) => r.id)).toEqual(['new']);
  });
  it('pushes attempts by their `at`', () => {
    const all = records({ attempts: [attempt('a1', T('09:00')), attempt('a2', T('11:00'))] });
    expect(toPush(all, T('10:00'))).toEqual([{ collection: 'attempts', id: 'a2', data: all.attempts[1], deleted: false }]);
  });
  it('never pushes sample answers', () => {
    expect(toPush(records({ attempts: [attempt('demo-3', T('11:00'))] }), T('10:00'))).toEqual([]);
  });
  it('sets row.deleted from the record', () => {
    const rows = toPush(records({ questions: [question('q1', T('11:00'), { deleted: true })], mockExams: [exam('e1', T('11:00'))] }), T('10:00'));
    expect(rows.map((r) => [r.collection, r.deleted])).toEqual([
      ['questions', true],
      ['mockExams', false],
    ]);
  });
  it('settings push under id "settings"', () => {
    const settings = { ...DEFAULT_SETTINGS, updatedAt: T('11:00') };
    expect(toPush(records({ settings }), T('10:00'))).toEqual([{ collection: 'settings', id: 'settings', data: settings, deleted: false }]);
    expect(toPush(records({ settings: DEFAULT_SETTINGS }), T('10:00'))).toEqual([]);
  });
});
