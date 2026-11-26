// The quiz prompt. The app fills it in, so she never edits it by hand.

import { PARTS } from './let-config';
import type { Area, Level } from './types';

// The answers come last, after every question, so copying the reply never shows question 1's answer.
// Each answer repeats its choice's text, so the app can tell when an answer landed on the wrong question.
const QUIZ_SCHEMA = `{
  "questions": [
    {
      "lang": "en | fil",
      "stem": "<question text>",
      "choices": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}]
    }
  ],
  "answers": [
    { "n": 1, "answer": "A | B | C | D", "answerText": "<the text of that choice, copied exactly>", "explanation": "<why the answer is right>" }
  ]
}`;

/** The prompt that asks Claude for one quiz's questions. Its reply comes back through the paste box. */
export function quizPrompt(o: { area: Area; subject: string; level: Level; major: string; n: number }): string {
  const levelText = o.level === 'secondary' ? `Secondary${o.major ? `, ${o.major}` : ''}` : 'Elementary';
  return `Write ${o.n} LET-style multiple-choice questions (4 choices, exactly one correct) on:
Part: ${PARTS[o.area].name}${o.area === 'Major' && o.major ? ` (${o.major})` : ''}  Subject: ${o.subject}
Level: ${levelText}

Mix: ~40% recall, ~40% application/scenario, ~20% analysis.
Distractors must be plausible (common misconceptions), not silly.
The choices are shuffled when shown, so never write a choice like "All of the above",
"None of the above" or "Both A and B".
For each item, the explanation must say why the answer is right AND why each
other choice is wrong, and name the source concept (theorist, law, principle).
If you are not certain of the correct answer, skip that item.
Write math as plain text (e.g. "x^2 + 3x - 4 = 0", "3/4").

Output one JSON object only, in this schema:
${QUIZ_SCHEMA}

Keep the answers hidden until the end: never put an answer or explanation inside "questions".
After the last question, list every answer and its explanation in "answers", numbered from 1
in the same order as the questions.
Write exactly ${o.n} questions and exactly ${o.n} answers: one answer for every question, none skipped.
For each answer, look back at that question's choices: "answer" is the letter of the correct choice,
and "answerText" is that same choice's text, copied word for word. The correct answer must be one of
the four choices; if it is not, rewrite the question.

Reply with the JSON only, inside one code block that starts with \`\`\`json, and write nothing
before or after the code block: no greeting, no notes, no summary. The whole reply is copied
with the code block's Copy button and pasted into an app that reads only JSON.
Finish the JSON completely. If ${o.n} questions would not fit in one reply, write fewer questions,
the same number of answers, and still close every bracket.`;
}
