import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import { expect, it } from 'vitest';

// The local-first rule, enforced: Supabase lives in src/sync, and screens reach it only through the trigger.
const SRC = fileURLToPath(new URL('..', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
const files = walk(SRC).map((p) => ({ path: relative(SRC, p).split(sep).join('/'), text: readFileSync(p, 'utf8') }));
const outside = files.filter((f) => !f.path.startsWith('sync/'));
const read = (path: string) => files.find((f) => f.path === path)!.text;

it('keeps supabase-js inside src/sync', () => {
  expect(outside.filter((f) => /from ['"]@supabase\//.test(f.text)).map((f) => f.path)).toEqual([]);
});

it('lets the rest of the app import only the trigger statically', () => {
  const names = outside.flatMap((f) => [...f.text.matchAll(/from ['"][./]+\/sync\/([\w-]+)['"]/g)].map((m) => `${f.path}: ${m[1]}`));
  expect(names.filter((n) => !n.endsWith(': trigger'))).toEqual([]);
});

it('is off when the env is missing', async () => {
  expect((await import('./trigger')).syncAvailable).toBe(false);
});

it.skip('every sync trigger site calls requestSync', () => {
  for (const f of ['app/App.tsx', 'features/practice/Session.tsx', 'features/mock/MockExam.tsx', 'features/mock/MockEntry.tsx', 'features/settings/Settings.tsx'])
    expect(read(f), f).toMatch(/requestSync\(\)/);
});

it('does not sync on each answer', () => {
  expect(read('db/repo.ts')).not.toMatch(/requestSync|sync\//);
});
