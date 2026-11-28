import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePasted, previewImport, previewQuiz, validateItem } from './validate';
import { examLabel } from './ids';
import { dayKey, heatWeeks, monthWeeks, streak, studyDays } from './dates';
import { drawMock, quotas } from './examDraw';
import { PARTS } from './let-config';
import { lastResults, projectedRating, recentByArea, recentPartScores, tallyBy, weakestSubjects } from './scoring';
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
// Ids come from the stem, so a test that varies only `sourceRef` gets a stem that differs too.
const q = (over: Record<string, unknown> = {}): Question =>
  validateItem(item('sourceRef' in over && !('stem' in over) ? { ...over, stem: `Which of the following? ${over.sourceRef}` } : over), 1, opts).question!;

describe('parsePasted', () => {
  it('joins the answers listed after the questions to their questions', () => {
    const { answer, ...bare } = item();
    const explanation = 'Why.';
    const p = parsePasted(
      JSON.stringify({
        questions: [bare, { ...bare, stem: 'Second?' }, { ...bare, stem: 'Third?' }],
        answers: [{ n: 2, answer: 'D', explanation: 'Because D.' }, { n: 1, answer, explanation }],
      }),
    );
    expect(p.kind === 'questions' && p.items).toMatchObject([{ answer: 'B', explanation: 'Why.' }, { answer: 'D', explanation: 'Because D.' }, { stem: 'Third?' }]);
    const ready = p.kind === 'questions' ? previewQuiz(p.items, { id: 'quiz-x', area: 'GenEd', subarea: 'english' }, opts.now) : null;
    expect(ready?.ready.map((q) => q.answer)).toEqual(['B', 'D']);
    expect(ready?.invalid.map((r) => r.n)).toEqual([3]);
  });
  it('strips code fences and prose', () => {
    const p = parsePasted('Here you go:\n```json\n[' + JSON.stringify(item()) + ']\n```\nLet me know!');
    expect(p.kind).toBe('questions');
  });
  // A chat once wrote 55 questions and 50 answers, skipping four and numbering the last one 50: question 50
  // would have been saved with question 55's key. Each answer repeats its choice's text, so the app sees it.
  it('leaves out a question whose answer text is not the choice its letter names', () => {
    const { answer, ...bare } = item(); // choices one, two, three, four; answer B is "two"
    const reply = {
      questions: [bare, { ...bare, stem: 'Second?' }, { ...bare, stem: 'Third?' }],
      answers: [
        { n: 1, answer, answerText: 'two' },
        { n: 2, answer: 'C', answerText: 'An answer from another question' },
        { n: 3, answer: 'D', answerText: 'Four.' }, // case and a full stop do not count
      ],
    };
    const p = parsePasted(JSON.stringify(reply));
    const r = p.kind === 'questions' ? previewQuiz(p.items, { id: 'quiz-x', area: 'GenEd', subarea: 'english' }, opts.now) : null;
    expect(r?.ready.map((q) => q.stem)).toEqual(['Which of the following?', 'Third?']);
    expect(r?.invalid).toEqual([{ n: 2, errors: [expect.stringMatching(/not choice C/)] }]);
  });
  it('counts the answers so a short list can be pointed out', () => {
    const { answer, ...bare } = item();
    const p = parsePasted(JSON.stringify({ questions: [bare, bare, bare], answers: [{ n: 1, answer }] }));
    expect(p.kind === 'questions' && p.answerCount).toBe(1);
    const list = parsePasted(JSON.stringify([item()]));
    expect(list.kind === 'questions' && list.answerCount).toBeUndefined();
  });
  // The prompt's own shape, as a chat sends it: one ```json block, sometimes with words around it anyway.
  it('reads the questions-then-answers reply from a code block with chat words around it', () => {
    const { answer, ...bare } = item();
    const reply = JSON.stringify({ questions: [bare, { ...bare, stem: 'Second?' }], answers: [{ n: 1, answer }, { n: 2, answer: 'C' }] }, null, 2);
    const p = parsePasted(`Sure! Here is your quiz:\n\`\`\`json\n${reply}\n\`\`\`\nGood luck on the LET!`);
    const r = p.kind === 'questions' ? previewQuiz(p.items, { id: 'quiz-x', area: 'GenEd', subarea: 'english' }, opts.now) : null;
    expect(r?.ready.map((q) => q.answer)).toEqual(['B', 'C']);
    expect(r?.invalid).toEqual([]);
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
    expect(r.n).toBe(7);
    expect(r.errors).toEqual(['answer is "E". It must be A, B, C, D, or empty.']);
  });
  it('takes any subject name as its id, and needs one', () => {
    expect(q().subarea).toBe('assessment-of-learning');
    expect(validateItem(item({ subarea: '' }), 1, opts).errors).toEqual(['has no subject.']);
  });
  it('rejects a figure with no description', () => {
    expect(validateItem(item({ media: { src: 'fig.png' } }), 1, opts).errors[0]).toMatch(/no description/);
  });
});

describe('previewQuiz', () => {
  const quiz = { id: 'quiz-x', area: 'GenEd' as const, subarea: 'english' };
  it('files every item under the quiz, needs a key, and keeps a repeat once', () => {
    const p = previewQuiz(
      [item({ area: 'ProfEd', subarea: 'nope' }), item({ answer: null, stem: 'Other?' }), item(), { stem: '' }],
      quiz,
      opts.now,
    );
    expect(p.ready).toHaveLength(1);
    expect(p.ready[0]).toMatchObject({ quizId: 'quiz-x', area: 'GenEd', subarea: 'english' });
    expect(p.ready[0].id.startsWith('quiz-x~')).toBe(true);
    expect(p.repeats).toBe(1);
    expect(p.invalid.map((r) => r.n)).toEqual([2, 4]);
    expect(p.invalid[0].errors[0]).toMatch(/no answer/);
  });
});

describe('ids and import', () => {
  it('derives IDs from the quiz and the stem and ignores any pasted id', () => {
    expect(q({ id: 'x-1' }).id).toBe(q().id);
    expect(q().id.startsWith('quiz-test~assessment-of-learning~')).toBe(true);
  });
  it('skips items already on the device or repeated in the list', () => {
    const p = previewImport([item(), item(), item({ stem: 'Other?' })], new Set([q({ stem: 'Other?' }).id]), opts);
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
    expect(p.invalid.map((r) => `Item ${r.n}: ${r.errors.join(' ')}`)).toEqual([]);
    expect(p.ready).toHaveLength(sample.length);
  });
});

describe('days and streaks', () => {
  it('counts 00:30 as the night before, and streaks across days', () => {
    expect(dayKey(new Date(2026, 10, 16, 0, 30))).toBe('2026-11-15');
    expect(streak(new Set(['2026-11-13', '2026-11-14', '2026-11-15']), '2026-11-15')).toBe(3);
  });
  it('counts only answered items toward study days, not a graded mock left blank', () => {
    const at = (d: number) => new Date(2026, 10, d, 10).toISOString();
    const { days, today } = studyDays(
      [
        { at: at(14), chosen: 'A' },
        { at: at(15), chosen: null },
        { at: at(15), chosen: null },
        { at: at(16), chosen: 'B' },
        { at: at(16), chosen: null },
      ],
      '2026-11-16',
    );
    expect([...days]).toEqual([
      ['2026-11-14', 1],
      ['2026-11-16', 1],
    ]);
    expect(today).toHaveLength(1);
    expect(streak(days, '2026-11-16')).toBe(1);
  });
  it('keeps a streak alive until tonight, across a month end', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-14', '2026-11-15'];
    expect(streak(new Set(days), '2026-11-16')).toBe(2);
    expect(streak(new Set(days), '2026-11-17')).toBe(0);
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
  it('lays a month out in Sunday-first weeks with blanks around it', () => {
    // November 2026 starts on a Sunday and has 30 days: five weeks, the last holding the 29th and 30th.
    const nov = monthWeeks(2026, 10);
    expect(nov).toHaveLength(5);
    expect(nov[0][0]).toBe('2026-11-01');
    expect(nov[4].filter(Boolean)).toEqual(['2026-11-29', '2026-11-30']);
    // February 2026 starts on a Sunday and fills exactly four weeks; December 2026 starts on a Tuesday.
    expect(monthWeeks(2026, 1)).toHaveLength(4);
    expect(monthWeeks(2026, 11)[0].slice(0, 3)).toEqual([null, null, '2026-12-01']);
  });
});

describe('exam draw', () => {
  const names = ['Foundations of Education', 'The Teaching Profession', 'Facilitating Learning', 'Assessment of Learning'];
  const subs = names.map((n) => q({ subarea: n }).subarea);
  const pool = names.flatMap((name, i) =>
    Array.from({ length: i === 0 ? 2 : 20 }, (_, k) => ({ ...q({ subarea: name, sourceRef: `${name} ${k}` }) })),
  );
  it('splits evenly across the picked subjects and never repeats an item', () => {
    expect(quotas(3, 8)).toEqual([3, 3, 2]);
    expect(quotas(0, 25)).toEqual([]);
    const ids = drawMock(pool, subs.slice(1, 4), 30, new Set(), () => 0.5);
    expect(new Set(ids).size).toBe(30);
    const per = new Map<string, number>();
    for (const id of ids) per.set(pool.find((x) => x.id === id)!.subarea, (per.get(pool.find((x) => x.id === id)!.subarea) ?? 0) + 1);
    expect([...per.values()]).toEqual([10, 10, 10]);
  });
  it('takes questions not in an earlier mock first', () => {
    const sub = subs[1];
    const group = pool.filter((x) => x.subarea === sub);
    const used = new Set(group.slice(0, 15).map((x) => x.id));
    expect(drawMock(pool, [sub], 5, used).every((id) => !used.has(id))).toBe(true);
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

describe('Progress window', () => {
  it("a part's sub-area rows add up to its figure, over the same recent 150 answers", () => {
    const old = q({ subarea: 'Foundations of Education', stem: 'An older question?' });
    const recent = q({ subarea: 'The Teaching Profession', stem: 'A recent question?' });
    const qs = new Map([
      [old.id, old],
      [recent.id, recent],
    ]);
    const att = (i: number, questionId: string): Attempt => ({
      id: `a${i}`,
      questionId,
      chosen: 'B',
      ms: 1000,
      mode: 'drill',
      at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    });
    // The oldest answer falls outside the window once 150 newer ones exist.
    const attempts = [att(0, old.id), ...Array.from({ length: 150 }, (_, i) => att(i + 1, recent.id))];
    const part = recentPartScores(attempts, qs).ProfEd!;
    const bySub = tallyBy([...recentByArea(attempts, qs).values()].flat(), qs, (x) => x.subarea);
    const rows = [...bySub.values()].reduce((n, tally) => n + tally.total, 0);
    expect(part.total).toBe(150);
    expect(rows).toBe(part.total);
    expect(bySub.has(old.subarea)).toBe(false);
  });
});

describe('lastResults', () => {
  it("keeps each question's latest answer, whatever order the attempts come in", () => {
    const one = q({ stem: 'One?', sourceRef: 'Handout 9, p.1' });
    const two = q({ stem: 'Two?', sourceRef: 'Handout 9, p.2' });
    const qs = new Map([
      [one.id, one],
      [two.id, two],
    ]);
    const att = (id: string, at: string, chosen: string): Attempt => ({ id: at + id, questionId: id, chosen: chosen as Attempt['chosen'], ms: 1, mode: 'drill', at });
    const r = lastResults([att(one.id, '2026-11-02T00:00:00Z', 'B'), att(one.id, '2026-11-01T00:00:00Z', 'A'), att(two.id, '2026-11-01T00:00:00Z', 'C')], qs);
    expect(r.get(one.id)).toBe(true);
    expect(r.get(two.id)).toBe(false);
    expect(r.size).toBe(2);
  });
});

describe('weakestSubjects', () => {
  it('ranks subjects by score and skips ones with too few answers', () => {
    const a = q({ subarea: 'Assessment of Learning' });
    const b = q({ subarea: 'Facilitating Learning' });
    const c = q({ subarea: 'Curriculum Development' });
    const qs = new Map([a, b, c].map((x) => [x.id, x]));
    const at = (x: Question, chosen: 'A' | 'B', i: number): Attempt => ({ id: `${x.id}-${i}`, questionId: x.id, chosen, ms: null, mode: 'quiz', at: `2026-11-0${i + 1}T00:00:00.000Z` });
    const attempts = [0, 1, 2].flatMap((i) => [at(a, 'B', i), at(b, i ? 'A' : 'B', i)]).concat(at(c, 'A', 0));
    expect(weakestSubjects(attempts, qs).map((w) => [w.subarea, w.tally.correct])).toEqual([
      ['facilitating-learning', 1],
      ['assessment-of-learning', 3],
    ]);
  });
});
