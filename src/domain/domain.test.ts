import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePasted, previewImport, validateItem } from './validate';
import { examLabel, questionId } from './ids';
import { buildCards, dueCards } from './leitner';
import { dayKey, heatWeeks, longestStreak, streak } from './dates';
import { drawExam, quotas } from './examDraw';
import { PARTS } from './let-config';
import { projectedRating } from './scoring';
import type { Attempt, Question } from './types';
import sample from './sample-questions.json';

const opts = { now: '2026-11-15T12:00:00.000Z', batchId: 'test' };
const item = (over: Record<string, unknown> = {}) => ({
  area: 'ProfEd',
  subarea: 'Assessment of Learning',
  topic: 'TOS',
  stem: 'Which of the following?',
  choices: ['one', 'two', 'three', 'four'],
  answer: 'B',
  source: 'review-center',
  sourceRef: 'Handout 3, p.12, #7',
  ...over,
});
const q = (over: Record<string, unknown> = {}): Question => validateItem(item(over), 1, opts).question!;

describe('parsePasted', () => {
  it('strips code fences and prose', () => {
    const p = parsePasted('Here you go:\n```json\n[' + JSON.stringify(item()) + ']\n```\nLet me know!');
    expect(p.kind).toBe('questions');
  });
  it('keeps the complete items of a cut-off list', () => {
    const one = JSON.stringify(item());
    const p = parsePasted(`[${one},${one},{"area":"Prof`);
    expect(p).toMatchObject({ kind: 'questions', truncatedAfter: 2 });
  });
  it('reports text with no JSON', () => expect(parsePasted('Sorry, I cannot read this page.').kind).toBe('not-json'));
  it('detects a backup', () =>
    expect(parsePasted('{"type":"backup","schemaVersion":1,"questions":[],"attempts":[]}').kind).toBe('backup'));
});

describe('validateItem', () => {
  it('names the item, field, and allowed values', () => {
    const r = validateItem(item({ answer: 'E' }), 7, opts);
    expect(r.label).toBe('Item 7 (Handout 3, p.12, #7)');
    expect(r.errors).toEqual(['answer is "E". It must be A, B, C, D, or empty.']);
  });
  it('stores the sub-area id and offers the nearest match for a misspelling', () => {
    expect(q().subarea).toBe('assessment-of-learning');
    const r = validateItem(item({ subarea: 'Assessment in Learning' }), 1, opts);
    expect(r.subareaFix?.suggestion).toBe('assessment-of-learning');
  });
  it('marks AI items unverified and keyless items needs-key', () => {
    expect(q({ source: 'ai', status: 'verified' }).status).toBe('unverified');
    expect(q({ answer: null }).status).toBe('needs-key');
  });
  it('rejects a figure with no description', () => {
    expect(validateItem(item({ media: { src: 'fig.png' } }), 1, opts).errors[0]).toMatch(/no description/);
  });
});

describe('ids and import', () => {
  it('derives IDs from the content and ignores any pasted id', () => {
    expect(q({ id: 'x-1' }).id).toBe('rc-handout-3-p-12-7');
    expect(questionId({ source: 'ai', sourceRef: '', stem: 'A  b' })).toBe(questionId({ source: 'ai', sourceRef: '', stem: 'a b' }));
  });
  it('skips items already in the bank or repeated in the list', () => {
    const p = previewImport([item(), item(), item({ sourceRef: 'Handout 3, p.12, #8' })], new Set(['rc-handout-3-p-12-8']), opts);
    expect(p.ready).toHaveLength(1);
    expect(p.duplicates).toHaveLength(2);
  });
  it('labels exams A..Z then AA', () => {
    const d = new Date(2026, 10, 15);
    expect(examLabel('GenEd', d, [])).toBe('GE-1115-A');
    const used = Array.from({ length: 26 }, (_, i) => `GE-1115-${String.fromCharCode(65 + i)}`);
    expect(examLabel('GenEd', d, used)).toBe('GE-1115-AA');
  });
  it('accepts every sample question', () => {
    const p = previewImport(sample, new Set(), opts);
    expect(p.invalid.map((r) => `${r.label}: ${r.errors.join(' ')}`)).toEqual([]);
    expect(p.ready).toHaveLength(sample.length);
  });
});

describe('Leitner', () => {
  const question = q();
  const qs = new Map([[question.id, question]]);
  const att = (at: string, chosen: string, mode: Attempt['mode'] = 'drill'): Attempt => ({
    id: at,
    questionId: question.id,
    chosen: chosen as Attempt['chosen'],
    ms: 1000,
    mode,
    at,
  });
  it('puts a wrong answer in box 1, due tomorrow', () => {
    const c = buildCards([att('2026-11-10T21:00:00', 'A')], qs).get(question.id)!;
    expect(c).toMatchObject({ box: 1, due: '2026-11-11' });
  });
  it('moves up only on a right answer in Review', () => {
    const c = buildCards([att('2026-11-10T21:00:00', 'A'), att('2026-11-11T21:00:00', 'B', 'review'), att('2026-11-12T21:00:00', 'B')], qs);
    expect(c.get(question.id)).toMatchObject({ box: 2, due: '2026-11-13' });
    expect(dueCards(c, '2026-11-12')).toHaveLength(0);
  });
  it('re-scores history when the key is fixed', () => {
    const fixed = new Map([[question.id, { ...question, answer: 'A' as const }]]);
    expect(buildCards([att('2026-11-10T21:00:00', 'A')], fixed).size).toBe(0);
  });
  it('counts 00:30 as the night before, and streaks across days', () => {
    expect(dayKey(new Date(2026, 10, 16, 0, 30))).toBe('2026-11-15');
    expect(streak(new Set(['2026-11-13', '2026-11-14', '2026-11-15']), '2026-11-15')).toBe(3);
  });
  it('keeps a streak alive until tonight, and finds the longest run across a month end', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-14', '2026-11-15'];
    expect(streak(new Set(days), '2026-11-16')).toBe(2);
    expect(streak(new Set(days), '2026-11-17')).toBe(0);
    expect(longestStreak(days)).toBe(4);
    expect(longestStreak([])).toBe(0);
  });
  it('lays the activity grid out in Sunday-first weeks that stop at today', () => {
    // 2026-11-16 is a Monday: this week holds Sunday and Monday only.
    const weeks = heatWeeks(new Map([['2026-11-16', 12], ['2026-11-08', 150]]), '2026-11-16', 3);
    expect(weeks.map((w) => w.length)).toEqual([7, 7, 2]);
    expect(weeks[0][0].day).toBe('2026-11-01');
    expect(weeks[1][0]).toEqual({ day: '2026-11-08', count: 150, level: 4 });
    expect(weeks[2][1]).toEqual({ day: '2026-11-16', count: 12, level: 2 });
    expect(weeks[2][0].level).toBe(0);
  });
});

describe('exam draw', () => {
  const pool = PARTS.ProfEd.subareas.flatMap((s, i) =>
    Array.from({ length: i === 0 ? 2 : 20 }, (_, k) => ({ ...q({ subarea: s.name, sourceRef: `${s.id} ${k}` }) })),
  );
  it('splits by weight and never repeats an item', () => {
    expect(quotas([1, 1, 2], 8)).toEqual([2, 2, 4]);
    const r = drawExam(pool, PARTS.ProfEd, 75, () => 0.5);
    expect(r.ok && new Set(r.itemIds).size).toBe(75);
  });
  it('fills a short sub-area from the others and says so', () => {
    const r = drawExam(pool, PARTS.ProfEd, 75);
    expect(r.ok && r.note).toMatch(/Foundations of Education had 2 of 9/);
  });
  it('refuses when the bank is too small', () => {
    expect(drawExam(pool.slice(0, 10), PARTS.ProfEd, 75)).toEqual({ ok: false, needed: 75, available: 10 });
  });
});

describe('rating', () => {
  it('weights parts and applies both passing rules', () => {
    expect(projectedRating('elementary', { GenEd: 80, ProfEd: 70 }).rating).toBeCloseTo(74);
    expect(projectedRating('elementary', { GenEd: 100, ProfEd: 49 })).toMatchObject({ passes: false, belowFloor: ['ProfEd'] });
    expect(projectedRating('secondary', { GenEd: 80 }).missing).toEqual(['ProfEd', 'Major']);
  });
});

describe('layers', () => {
  const read = (dir: string) =>
    readdirSync(fileURLToPath(new URL(dir, import.meta.url)), { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile() && /\.tsx?$/.test(f.name) && !f.name.endsWith('.test.ts'))
      .map((f) => readFileSync(`${f.parentPath}/${f.name}`, 'utf8'));
  const imports = (src: string) => [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);

  it('domain imports nothing outside domain', () => {
    for (const src of read('./')) for (const i of imports(src)) expect(i.startsWith('./')).toBe(true);
  });
  it('db imports only domain and Dexie', () => {
    for (const src of read('../db/'))
      for (const i of imports(src)) expect(i.startsWith('./') || i.startsWith('../domain/') || i.startsWith('dexie')).toBe(true);
  });
  it('ui never imports db or features', () => {
    for (const src of read('../ui/')) for (const i of imports(src)) expect(/\.\.\/(db|features)\//.test(i)).toBe(false);
  });
});
