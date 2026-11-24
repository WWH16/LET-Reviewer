// The quiz prompt. The app fills it in, so she never edits it by hand.

import { PARTS } from './let-config';
import type { Area, Level } from './types';

const QUIZ_SCHEMA = `{
  "topic": "<short topic name>",
  "lang": "en | fil",
  "stem": "<question text>",
  "choices": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
  "answer": "A | B | C | D",
  "explanation": "<why the answer is right>"
}`;

/** The prompt that asks Claude for one quiz's questions. Its reply comes back through the paste box. */
export function quizPrompt(o: { area: Area; subject: string; topic: string; level: Level; major: string; n: number }): string {
  const levelText = o.level === 'secondary' ? `Secondary${o.major ? `, ${o.major}` : ''}` : 'Elementary';
  return `Write ${o.n} LET-style multiple-choice questions (4 choices, exactly one correct) on:
Part: ${PARTS[o.area].name}  Subject: ${o.subject}${o.topic ? `  Topic: ${o.topic}` : ''}
Level: ${levelText}

Mix: ~40% recall, ~40% application/scenario, ~20% analysis.
Distractors must be plausible (common misconceptions), not silly.
The choices are shuffled when shown, so never write a choice like "All of the above",
"None of the above" or "Both A and B".
For each item, the explanation must say why the answer is right AND why each
other choice is wrong, and name the source concept (theorist, law, principle).
If you are not certain of the correct answer, skip that item.
Write math as plain text (e.g. "x^2 + 3x - 4 = 0", "3/4").

Output a JSON array only, one object per question, in this schema:
${QUIZ_SCHEMA}`;
}
