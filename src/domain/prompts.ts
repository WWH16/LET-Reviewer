// Prompt templates (plan §5, §8.6). The app fills them in, so she never edits them by hand.

import { PARTS } from './let-config';
import type { Area, Level } from './types';

const SCHEMA = `{
  "area": "GenEd | ProfEd | Major",
  "subarea": "<copied exactly from the allowed list>",
  "topic": "<short topic name>",
  "lang": "en | fil",
  "stem": "<question text>",
  "choices": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
  "answer": "A | B | C | D | null",
  "explanation": "<why the answer is right>",
  "source": "review-center | ai",
  "sourceRef": "<where it came from>",
  "status": "verified | unverified | needs-key | flagged",
  "media": null,
  "tags": []
}`;

const allowed = () =>
  (Object.keys(PARTS) as Area[]).map((a) => `${a}: ${PARTS[a].subareas.map((s) => s.name).join('; ')}`).join('\n');

export function templateA(): string {
  return `You are converting a scanned LET review handout into JSON. Transcribe exactly.
Do NOT invent, fix, or improve questions or answers.

For each numbered item, output one object with:
area (GenEd|ProfEd|Major), subarea, topic, lang ("en" or "fil"),
stem, choices [{key,text}], answer (the letter from the handout's key, or null
if no key is shown), explanation ("" if none on the page), source "review-center",
sourceRef "<Handout name>, p.<page>, #<item>", status ("verified" if key present,
else "needs-key"), media null, tags [].

Rules:
- Math: write it as plain text (e.g. "x^2 + 3x - 4 = 0", "3/4"), never as an image.
- If an item depends on a figure/table, transcribe the table as text; describe
  a figure in "media.alt" in one or two sentences.
- If any text is unreadable, put "[unreadable]" and set status "flagged".
- "subarea" must be copied exactly from the allowed list below. If none fits,
  use "unknown". Do not make up a new one.
- Do not include an "id" field.
Return a JSON array only.

Allowed sub-areas:
${allowed()}

Schema:
${SCHEMA}

Handout name: ____  Page: ____`;
}

export function templateB(o: {
  area: Area;
  subarea: string;
  topic: string;
  level: Level;
  major: string;
  n?: number;
}): string {
  const levelText = o.level === 'secondary' ? `Secondary${o.major ? `, ${o.major}` : ''}` : 'Elementary';
  const topic = o.topic || o.subarea;
  return `Write ${o.n ?? 10} LET-style multiple-choice questions (4 choices, one correct) on:
Area: ${o.area}  Subarea: ${o.subarea}  Topic: ${topic}
Level: ${levelText}

Base them ONLY on this material I reviewed:
<<< paste notes / handout excerpt >>>

Mix: ~40% recall, ~40% application/scenario, ~20% analysis.
Distractors must be plausible (common misconceptions), not silly.
For each item, the explanation must say why the answer is right AND why each
other choice is wrong, and name the source concept (theorist, law, principle).
If you are not certain of the correct answer, skip that item.

Output a JSON array in this schema:
${SCHEMA}
Use "${o.subarea}" exactly as the subarea value. Do not include an "id" field.
source "ai", status "unverified", sourceRef "AI from: ${topic} notes".`;
}

export function templateC(n: number, label: string): string {
  return `This is a photo of a multiple-choice answer sheet with bubbles A–D.
Exam ID is printed at the top: ${label}. Items: ${n}.
For each item number 1..${n}, report which single bubble is shaded.
- If no bubble is shaded: null.
- If two or more are shaded, or a bubble looks erased or faint: give your best
  guess AND add the item number to "unsure".
Do not guess the correct answers. Only report what is shaded.
Return JSON only: { "examId": "${label}", "answers": { "1": "A", ... }, "unsure": [ ... ] }`;
}
