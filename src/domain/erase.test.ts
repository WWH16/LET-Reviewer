import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, settingsAfterErase, type Settings } from './types';

describe('settingsAfterErase', () => {
  const hers: Settings = {
    ...DEFAULT_SETTINGS,
    name: 'Sam',
    avatarBase: 'girl',
    avatarParts: { top: 'bun' },
    onboarded: true,
    level: 'secondary',
    major: 'Filipino',
    subjects: { GenEd: [{ id: 'eng', name: 'English' }], ProfEd: [], Major: [] },
    examDate: '2027-03-21',
    timer: 'off',
    strictSheet: true,
    updatedAt: '2026-11-20T00:00:00.000Z',
  };

  it('keeps who she is, so the welcome does not come back', () => {
    expect(settingsAfterErase(hers)).toMatchObject({
      name: 'Sam',
      avatarBase: 'girl',
      avatarParts: { top: 'bun' },
      onboarded: true,
      level: 'secondary',
      major: 'Filipino',
    });
  });

  it('puts everything else back to the defaults', () => {
    expect(settingsAfterErase(hers)).toMatchObject({
      subjects: DEFAULT_SETTINGS.subjects,
      examDate: null,
      timer: DEFAULT_SETTINGS.timer,
      strictSheet: false,
    });
  });

  it('keeps the date of her last change, so the erase stays on this device and is not sent to her account', () => {
    expect(settingsAfterErase(hers).updatedAt).toBe('2026-11-20T00:00:00.000Z');
  });
});
