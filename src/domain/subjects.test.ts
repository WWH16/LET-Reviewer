import { describe, expect, it } from 'vitest';
import { setSubjectNames, subareaName, subjectId, subjectsOf } from './subjects';
import type { Subjects } from './types';

const mine: Subjects = { GenEd: [{ id: 'english', name: 'English 1' }], ProfEd: [], Major: [] };

describe('subjects', () => {
  it('lists hers first, then any subject her questions still use', () => {
    const used = [
      { area: 'GenEd' as const, subarea: 'english' },
      { area: 'GenEd' as const, subarea: 'filipino' },
      { area: 'GenEd' as const, subarea: 'gone', deleted: true },
      { area: 'ProfEd' as const, subarea: 'ethics' },
    ];
    expect(subjectsOf('GenEd', mine, used).map((s) => s.id)).toEqual(['english', 'filipino']);
    expect(subjectsOf('Major', mine, used)).toEqual([]);
  });
  it('names a subject from her list, else the old name, else its id', () => {
    setSubjectNames(mine);
    expect(subareaName('english')).toBe('English 1');
    expect(subareaName('filipino')).toBe('Filipino');
    expect(subareaName('home-economics')).toBe('Home economics');
  });
  it('gives a new subject an id no other subject in the part has', () => {
    expect(subjectId('English', new Set(['english', 'english-2']))).toBe('english-3');
    expect(subjectId('  ', new Set())).toBe('subject');
  });
});
