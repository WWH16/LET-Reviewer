// Shuffled choices: each quiz take and each mock shows the choices in a new order, so the answer is not
// always the same letter. She sees the letters A to D in that order; answers are saved as the original
// keys, so history and Stats never depend on how a question was shown.

import { shuffle } from './examDraw';
import { KEYS, type Key, type Question } from './types';

/** A choice that names other choices ("all of the above", "both A and B") stops making sense once moved. */
const POINTS_AT_OTHERS = /\b(all|none|both|neither|either) of (the )?(above|these|the choices|the options)\b|\b[A-D] and [A-D]\b|\bonly [A-D]\b/i;

export const keepsOrder = (q: Pick<Question, 'choices'>) => q.choices.some((c) => POINTS_AT_OTHERS.test(c.text));

/** The order to show the choices in, as original keys. */
export function choiceOrder(q: Pick<Question, 'choices'>, rng: () => number = Math.random): Key[] {
  const keys = q.choices.map((c) => c.key);
  return keepsOrder(q) ? keys : shuffle(keys, rng);
}

/** The question as shown: choices relettered A to D in `order`, the answer relettered to match. */
export function shown(q: Question, order: readonly Key[] | undefined): Question {
  if (!order) return q;
  const choices = order.map((k, i) => ({ key: KEYS[i], text: q.choices.find((c) => c.key === k)?.text ?? '' }));
  const at = q.answer === null ? -1 : order.indexOf(q.answer);
  return { ...q, choices, answer: at < 0 ? null : KEYS[at] };
}

/** The original key behind the letter she picked. */
export const originalKey = (order: readonly Key[] | undefined, letter: Key): Key => (order ? (order[KEYS.indexOf(letter)] ?? letter) : letter);
