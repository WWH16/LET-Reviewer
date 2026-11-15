import { describe, expect, it } from 'vitest';
import { checkBackup } from './backup';
import { SCHEMA_VERSION } from '../domain/types';

describe('checkBackup', () => {
  const ok = { type: 'backup', schemaVersion: SCHEMA_VERSION, exportedAt: '2026-11-08T00:00:00Z', questions: [{ deleted: false }, { deleted: true }], attempts: [{}, {}, {}] };

  it('counts live questions and answers for the preview', () => {
    expect(checkBackup(ok)).toMatchObject({ ok: true, counts: { questions: 1, attempts: 3 } });
  });
  it('refuses a backup from a newer version and changes nothing', () => {
    const r = checkBackup({ ...ok, schemaVersion: SCHEMA_VERSION + 1 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/newer version .* Nothing was restored/);
  });
  it('refuses a file with no version', () => {
    expect(checkBackup({ questions: [], attempts: [] }).ok).toBe(false);
  });
});
