// The avatar editor offers only the features that suit the chosen face.
import { describe, expect, it } from 'vitest';
import { AVATAR_BASES, AVATAR_PARTS, choicesFor, partValue, partsFor } from './Avatar';

const part = (key: string) => AVATAR_PARTS.find((p) => p.key === key)!;

describe('avatar features by face', () => {
  it('gives the woman no facial hair and the man keeps it', () => {
    expect(partsFor('girl').map((p) => p.key)).not.toContain('facialHair');
    expect(partsFor('boy').map((p) => p.key)).toContain('facialHair');
  });
  it('offers each face its own hair', () => {
    const girl = choicesFor(part('top'), 'girl');
    const boy = choicesFor(part('top'), 'boy');
    expect(girl).toEqual(expect.arrayContaining(['bob', 'straight01', 'hijab']));
    expect(girl).not.toEqual(expect.arrayContaining(['theCaesar']));
    expect(girl).not.toContain('none');
    expect(boy).toEqual(expect.arrayContaining(['shortFlat', 'theCaesar', 'turban', 'none']));
    expect(boy).not.toContain('bob');
    expect(boy).not.toContain('hijab');
  });
  it('shows the face default for a stored choice that does not suit the face', () => {
    expect(partValue({ avatarBase: 'girl', avatarParts: { facialHair: 'beardLight' } }, part('facialHair'))).toBe('none');
    expect(partValue({ avatarBase: 'boy', avatarParts: { top: 'bob' } }, part('top'))).toBe('shortFlat');
    expect(partValue({ avatarBase: 'boy', avatarParts: { facialHair: 'beardLight' } }, part('facialHair'))).toBe('beardLight');
  });
  it("keeps each face's own defaults among its choices", () => {
    for (const base of ['girl', 'boy'] as const)
      for (const p of AVATAR_PARTS) expect(choicesFor(p, base)).toContain(AVATAR_BASES[base].parts[p.key]);
  });
});
