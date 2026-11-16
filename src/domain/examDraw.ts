// Draws mock exam items in proportion to the sub-area weights (plan §8.1).

import type { PartConfig } from './let-config';
import type { Question } from './types';

export const KEY_LOOKS_WRONG = 'Key looks wrong';

/** Questions that can be graded: a key exists and nobody has doubted it. */
export const gradable = (q: Question) =>
  !q.deleted && q.answer !== null && q.status !== 'needs-key' && q.status !== 'flagged' && q.flag?.reason !== KEY_LOOKS_WRONG;

export type SourceFilter = 'rc' | 'verified' | 'all';

export const SOURCE_LABELS: Record<SourceFilter, string> = {
  rc: 'Review-center only',
  verified: 'Include verified AI questions',
  all: 'Include all AI questions',
};

export function matchesSource(q: Question, f: SourceFilter): boolean {
  if (f === 'rc') return q.source === 'review-center';
  if (f === 'verified') return q.source === 'review-center' || q.status === 'verified';
  return true;
}

export function shuffle<T>(list: T[], rng: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Question of the Day: one gradable question, the same all day and different the next. A small string
 * hash of the day picks from the question ids in a fixed order, so it needs no saved state.
 */
export function questionOfTheDay(day: string, questions: Iterable<Question>): string | null {
  const ids = [...questions].filter(gradable).map((q) => q.id).sort();
  if (!ids.length) return null;
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}

/** Largest-remainder split of n items by weight. */
export function quotas(weights: readonly number[], n: number): number[] {
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (w / total) * n);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; out.reduce((s, x) => s + x, 0) < n; k++) out[order[k % order.length][1]]++;
  return out;
}

export type DrawResult =
  | { ok: true; itemIds: string[]; note: string | null }
  | { ok: false; needed: number; available: number };

export function drawExam(pool: readonly Question[], part: PartConfig, n: number, rng: () => number = Math.random): DrawResult {
  const items = pool.filter((q) => q.area === part.area);
  if (items.length < n) return { ok: false, needed: n, available: items.length };

  const q = quotas(part.subareas.map((s) => s.weight), n);
  const picked: Question[] = [];
  const short: string[] = [];
  part.subareas.forEach((s, i) => {
    const group = shuffle(items.filter((x) => x.subarea === s.id), rng);
    picked.push(...group.slice(0, q[i]));
    if (group.length < q[i]) short.push(`${s.name} had ${group.length} of ${q[i]}`);
  });
  const taken = new Set(picked.map((x) => x.id));
  const rest = shuffle(items.filter((x) => !taken.has(x.id)), rng);
  const fill = n - picked.length;
  picked.push(...rest.slice(0, fill));

  const note = short.length ? `${short.join('; ')}. ${fill} item${fill === 1 ? ' was' : 's were'} filled from other sub-areas.` : null;
  return { ok: true, itemIds: shuffle(picked, rng).map((x) => x.id), note };
}
