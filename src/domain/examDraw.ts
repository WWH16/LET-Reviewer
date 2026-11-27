// Draws mock exam items from quiz questions, split evenly across the subjects she picks.

import type { Question } from './types';

export function shuffle<T>(list: T[], rng: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n items split evenly across k subjects; the first ones take the remainder. */
export const quotas = (k: number, n: number) => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));

/**
 * A mock's items: n split evenly across the picked subjects, drawn from that part's quiz questions.
 * Questions not in an earlier mock come first, so back-to-back mocks differ. The caller checks first
 * that every subject has enough questions (`quotas`); a short one gives fewer items.
 */
export function drawMock(
  pool: readonly Question[],
  subjects: readonly string[],
  n: number,
  used: ReadonlySet<string>,
  rng: () => number = Math.random,
): string[] {
  const need = quotas(subjects.length, n);
  const picked = subjects.flatMap((subarea, i) => {
    const group = pool.filter((q) => q.subarea === subarea);
    const fresh = shuffle(group.filter((q) => !used.has(q.id)), rng);
    const seen = shuffle(group.filter((q) => used.has(q.id)), rng);
    return [...fresh, ...seen].slice(0, need[i]);
  });
  return shuffle(picked, rng).map((q) => q.id);
}
