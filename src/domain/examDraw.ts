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

/** Largest-remainder split of n items by weight. */
export function quotas(weights: readonly number[], n: number): number[] {
  if (!weights.length) return [];
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (w / total) * n);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; out.reduce((s, x) => s + x, 0) < n; k++) out[order[k % order.length][1]]++;
  return out;
}

export type DrawResult =
  | { ok: true; itemIds: string[] }
  | { ok: false; short: { subarea: string; have: number; need: number }[] };

/**
 * A mock's items: n split evenly across the picked subjects, drawn from that part's quiz questions.
 * Questions not in an earlier mock come first, so back-to-back mocks differ. A subject with too few
 * questions fails the draw and says how many it has.
 */
export function drawMock(
  pool: readonly Question[],
  subjects: readonly string[],
  n: number,
  used: ReadonlySet<string>,
  rng: () => number = Math.random,
): DrawResult {
  const need = quotas(subjects.map(() => 1), n);
  const short: { subarea: string; have: number; need: number }[] = [];
  const picked: Question[] = [];
  subjects.forEach((subarea, i) => {
    const group = pool.filter((q) => q.subarea === subarea);
    if (group.length < need[i]) short.push({ subarea, have: group.length, need: need[i] });
    const fresh = shuffle(group.filter((q) => !used.has(q.id)), rng);
    const seen = shuffle(group.filter((q) => used.has(q.id)), rng);
    picked.push(...[...fresh, ...seen].slice(0, need[i]));
  });
  if (short.length) return { ok: false, short };
  return { ok: true, itemIds: shuffle(picked, rng).map((q) => q.id) };
}
