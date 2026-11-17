import { expect, it } from 'vitest';
import { demoAttempts } from './demo';
import { previewImport } from './validate';
import { recentPartScores } from './scoring';
import { dayKey, streak } from './dates';
import sample from './sample-questions.json';

it('fills every part, keeps a streak into today and never answers in the future', () => {
  const now = new Date('2026-11-17T14:00:00');
  const qs = previewImport(sample, new Set(), { now: now.toISOString(), batchId: 'sample' }).ready;
  const list = demoAttempts(qs, now);
  const parts = recentPartScores(list, new Map(qs.map((q) => [q.id, q])));
  expect(parts.GenEd!.total).toBeGreaterThanOrEqual(20);
  expect(parts.ProfEd!.total).toBeGreaterThanOrEqual(20);
  expect(list.every((a) => a.at <= now.toISOString())).toBe(true);
  expect(streak(new Set(list.map((a) => dayKey(a.at))), dayKey(now))).toBeGreaterThanOrEqual(6);
  expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
});
