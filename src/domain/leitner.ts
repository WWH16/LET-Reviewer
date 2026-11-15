// Spaced repetition (plan §7). Cards are worked out from attempts every time, never stored,
// so two devices can never disagree and fixing an answer key re-scores history.

import { addDays, dayKey } from './dates';
import type { Attempt, Question } from './types';

export const INTERVALS = [1, 2, 4, 8, 16];

export interface Card {
  questionId: string;
  box: number;
  due: string;
  mastered: boolean;
}

/** `null` when the question has no key (needs-key) or is gone, so the attempt cannot be scored. */
export function isCorrect(a: Attempt, q: Question | undefined): boolean | null {
  if (!q || q.deleted || q.answer === null) return null;
  return a.chosen === q.answer;
}

export function buildCards(attempts: readonly Attempt[], questions: ReadonlyMap<string, Question>): Map<string, Card> {
  const cards = new Map<string, Card>();
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  for (const a of sorted) {
    const ok = isCorrect(a, questions.get(a.questionId));
    if (ok === null) continue;
    const day = dayKey(a.at);
    const card = cards.get(a.questionId);
    if (!ok) {
      // A wrong answer in any mode puts the item in box 1, due tomorrow.
      cards.set(a.questionId, { questionId: a.questionId, box: 1, due: addDays(day, INTERVALS[0]), mastered: false });
    } else if (card && !card.mastered && a.mode === 'review') {
      // A right answer in Review moves it up one box. After box 5 it is mastered.
      if (card.box >= INTERVALS.length) card.mastered = true;
      else {
        card.box += 1;
        card.due = addDays(day, INTERVALS[card.box - 1]);
      }
    }
  }
  return cards;
}

export function dueCards(cards: ReadonlyMap<string, Card>, today: string): Card[] {
  return [...cards.values()].filter((c) => !c.mastered && c.due <= today).sort((a, b) => a.due.localeCompare(b.due));
}
