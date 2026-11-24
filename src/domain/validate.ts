// Turns text pasted from a Claude chat into checked questions (plan §5, Import rules).
// Chat output arrives wrapped in code fences, with prose around it, and sometimes cut off.

import { slug } from './ids';
import { batchQuizId, quizQuestionId } from './quiz';
import { KEYS, type Area, type Choice, type Key, type Question } from './types';

// ---------- Parsing ----------

export type Parsed =
  | { kind: 'empty' }
  | { kind: 'not-json' }
  | { kind: 'questions'; items: unknown[]; truncatedAfter: number | null; unreadable: number[] }
  | { kind: 'backup'; value: Record<string, unknown> }
  | { kind: 'unknown' };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The quiz prompt asks for the answers in their own list after all the questions, so they stay out of
 * sight while she copies. Each one joins its question by `n` (1-based), or by position without one.
 */
function withAnswers(items: unknown[], answers: unknown): unknown[] {
  if (!Array.isArray(answers)) return items;
  const byN = new Map(answers.filter(isObj).map((a, i) => [typeof a.n === 'number' ? a.n : i + 1, a]));
  return items.map((q, i) => {
    const a = byN.get(i + 1);
    if (!isObj(q) || !a) return q;
    return { ...q, answer: q.answer ?? a.answer, explanation: q.explanation ?? a.explanation };
  });
}

function classify(v: unknown): Parsed {
  if (Array.isArray(v)) return { kind: 'questions', items: v, truncatedAfter: null, unreadable: [] };
  if (!isObj(v)) return { kind: 'unknown' };
  if (v.type === 'backup' || ('schemaVersion' in v && Array.isArray(v.questions) && Array.isArray(v.attempts)))
    return { kind: 'backup', value: v };
  for (const k of ['questions', 'items', 'data']) {
    if (Array.isArray(v[k])) return { kind: 'questions', items: withAnswers(v[k] as unknown[], v.answers), truncatedAfter: null, unreadable: [] };
  }
  if ('stem' in v) return { kind: 'questions', items: [v], truncatedAfter: null, unreadable: [] };
  return { kind: 'unknown' };
}

/**
 * Recovers the complete objects from a JSON array that was cut off or has one broken item.
 * Walks the text tracking strings and nesting, and cuts out each top-level `{...}`.
 */
function recoverArray(s: string): { items: unknown[]; truncated: boolean; unreadable: number[] } {
  const items: unknown[] = [];
  const unreadable: number[] = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let start = -1;
  let closed = false;
  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' || ch === ']') {
      if (depth === 0 && ch === ']') {
        closed = true;
        break;
      }
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          items.push(JSON.parse(s.slice(start, i + 1)));
        } catch {
          unreadable.push(items.length + unreadable.length + 1);
        }
        start = -1;
      }
    }
  }
  return { items, truncated: !closed || depth > 0, unreadable };
}

export function parsePasted(text: string): Parsed {
  const cleaned = text.replace(/```[a-zA-Z]*/g, '').trim();
  if (!cleaned) return { kind: 'empty' };
  const firstArr = cleaned.indexOf('[');
  const firstObj = cleaned.indexOf('{');
  const starts = [firstArr, firstObj].filter((i) => i >= 0);
  if (!starts.length) return { kind: 'not-json' };
  const start = Math.min(...starts);
  const closer = cleaned[start] === '[' ? ']' : '}';
  const end = cleaned.lastIndexOf(closer);
  if (end > start) {
    try {
      return classify(JSON.parse(cleaned.slice(start, end + 1)));
    } catch {
      /* fall through to recovery */
    }
  }
  if (cleaned[start] === '[') {
    const r = recoverArray(cleaned.slice(start));
    if (r.items.length || r.unreadable.length)
      return { kind: 'questions', items: r.items, truncatedAfter: r.truncated ? r.items.length : null, unreadable: r.unreadable };
  }
  return { kind: 'not-json' };
}

// ---------- Validation ----------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface ItemResult {
  /** 1-based position in the pasted list. */
  n: number;
  label: string;
  question: Question | null;
  errors: string[];
  duplicate: boolean;
}

const AREAS: Area[] = ['GenEd', 'ProfEd', 'Major'];

function toChoices(v: unknown): Choice[] | null {
  let list: { key?: unknown; text?: unknown }[] = [];
  if (Array.isArray(v)) list = v.map((c, i) => (typeof c === 'string' ? { key: KEYS[i], text: c } : (c as object)));
  else if (isObj(v)) list = Object.entries(v).map(([key, text]) => ({ key, text }));
  else return null;
  return list.map((c, i) => ({
    key: (typeof c.key === 'string' ? c.key.trim().toUpperCase().charAt(0) : KEYS[i]) as Key,
    text: typeof c.text === 'string' ? c.text.trim() : '',
  }));
}

function toAnswer(v: unknown): Key | null | 'bad' {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return 'bad';
  const k = v.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return (KEYS as readonly string[]).includes(k) ? (k as Key) : 'bad';
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Checks one pasted item. Never throws. Every error names the field and what is allowed,
 * so the import screen can show it as is (DX audit, Error Message Audit).
 */
export function validateItem(raw: unknown, n: number, opts: { now: string; batchId: string }): ItemResult {
  const errors: string[] = [];
  const o = isObj(raw) ? raw : {};
  const label = `Item ${n}`;
  const base = { n, label, duplicate: false };
  if (!isObj(raw)) return { ...base, question: null, errors: ['is not a question object.'] };

  const areaRaw = str(o.area);
  const area = AREAS.find((a) => norm(a) === norm(areaRaw));
  if (!area) errors.push(`area is "${areaRaw}". It must be GenEd, ProfEd, or Major.`);

  const subarea = slug(str(o.subarea));
  if (!subarea || subarea === 'unknown') errors.push('has no subject.');

  const stem = str(o.stem);
  if (!stem) errors.push('stem (the question text) is empty.');

  const choices = toChoices(o.choices);
  if (!choices) errors.push('choices is missing. It must be a list of 4 choices, A to D.');
  else {
    const keys = choices.map((c) => c.key).join('');
    if (choices.length !== 4 || keys !== 'ABCD')
      errors.push(`has ${choices.length} choices (${keys || 'none'}). It must have exactly 4, keyed A, B, C, D.`);
    const empty = choices.filter((c) => !c.text).map((c) => c.key);
    if (empty.length) errors.push(`choice ${empty.join(', ')} has no text.`);
  }

  const answer = toAnswer(o.answer);
  if (answer === 'bad') errors.push(`answer is "${String(o.answer)}". It must be A, B, C, D, or empty.`);


  let media: Question['media'] = null;
  if (isObj(o.media)) {
    const src = str(o.media.src);
    const alt = str(o.media.alt);
    if (src && !alt) errors.push('has a figure with no description. Add a one-sentence media.alt, or remove the figure.');
    if (src || alt) media = src ? { src, alt } : { alt };
  }

  const langRaw = norm(str(o.lang));
  const lang = langRaw === 'fil' || langRaw === 'filipino' || langRaw === 'tl' ? 'fil' : 'en';

  if (errors.length || !area || !choices || answer === 'bad') {
    return { ...base, question: null, errors };
  }

  const q: Question = {
    id: quizQuestionId(batchQuizId(opts.batchId, subarea), stem),
    quizId: batchQuizId(opts.batchId, subarea),
    area,
    subarea,
    topic: str(o.topic),
    lang,
    stem,
    choices,
    answer,
    explanation: str(o.explanation),
    media,
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
    updatedAt: opts.now,
    deleted: false,
  };
  return { ...base, question: q, errors: [] };
}

export interface ImportPreview {
  results: ItemResult[];
  ready: Question[];
  duplicates: ItemResult[];
  invalid: ItemResult[];
}

/** Checks a pasted list against the bank. IDs already in the bank, or repeated in the list, are skipped. */
export function previewImport(
  items: unknown[],
  existingIds: ReadonlySet<string>,
  opts: { now: string; batchId: string },
  overrides: Record<number, { subarea?: string }> = {},
): ImportPreview {
  const seen = new Set<string>();
  const results = items.map((raw, i) => {
    const n = i + 1;
    const patched = overrides[n] && isObj(raw) ? { ...raw, ...overrides[n] } : raw;
    const r = validateItem(patched, n, opts);
    if (r.question) {
      if (existingIds.has(r.question.id) || seen.has(r.question.id)) r.duplicate = true;
      seen.add(r.question.id);
    }
    return r;
  });
  return {
    results,
    ready: results.filter((r) => r.question && !r.duplicate).map((r) => r.question!),
    duplicates: results.filter((r) => r.duplicate),
    invalid: results.filter((r) => !r.question),
  };
}

export interface QuizPreview {
  ready: Question[];
  /** Items that could not be used, with why. */
  invalid: { n: number; errors: string[] }[];
  /** Items repeated within the paste: kept once. */
  repeats: number;
}

/**
 * Checks a pasted reply for one quiz. The quiz decides the part and subject, so the reply needs only the
 * questions, and every question needs an answer key.
 */
export function previewQuiz(items: unknown[], quiz: { id: string; area: Area; subarea: string }, now: string): QuizPreview {
  const ready: Question[] = [];
  const invalid: QuizPreview['invalid'] = [];
  const seen = new Set<string>();
  let repeats = 0;
  items.forEach((raw, i) => {
    const n = i + 1;
    const patched = isObj(raw) ? { ...raw, area: quiz.area, subarea: quiz.subarea } : raw;
    const r = validateItem(patched, n, { now, batchId: '' });
    const errors = r.question?.answer === null ? ['has no answer. It must be A, B, C or D.'] : r.errors;
    if (!r.question || errors.length) return invalid.push({ n, errors });
    const id = quizQuestionId(quiz.id, r.question.stem);
    if (seen.has(id)) return repeats++;
    seen.add(id);
    ready.push({ ...r.question, id, quizId: quiz.id });
  });
  return { ready, invalid, repeats };
}
