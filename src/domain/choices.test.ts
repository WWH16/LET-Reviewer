import { describe, expect, it } from 'vitest';
import { choiceOrder, keepsOrder, originalKey, shown } from './choices';
import type { Key, Question } from './types';

const q = (texts: string[], answer: Key = 'B') =>
  ({ choices: texts.map((text, i) => ({ key: 'ABCD'[i] as Key, text })), answer }) as Question;

describe('shuffled choices', () => {
  it('reletters the choices and the answer, and maps her letter back to the original key', () => {
    const order: Key[] = ['C', 'A', 'D', 'B'];
    const s = shown(q(['one', 'two', 'three', 'four']), order);
    expect(s.choices.map((c) => `${c.key}:${c.text}`)).toEqual(['A:three', 'B:one', 'C:four', 'D:two']);
    expect(s.answer).toBe('D');
    expect(originalKey(order, 'D')).toBe('B');
  });
  it('keeps the order when a choice points at the others', () => {
    for (const t of ['All of the above', 'None of these', 'Both A and B', 'Only C'])
      expect(keepsOrder(q(['one', 'two', 'three', t]))).toBe(true);
    expect(choiceOrder(q(['one', 'two', 'three', 'All of the above']), () => 0)).toEqual(['A', 'B', 'C', 'D']);
    expect(keepsOrder(q(['Vitamins', 'Above sea level', 'Andes', 'Both hands']))).toBe(false);
  });
  it('shuffles the rest, and shows an unshuffled question as is', () => {
    expect(choiceOrder(q(['one', 'two', 'three', 'four']), () => 0)).not.toEqual(['A', 'B', 'C', 'D']);
    const plain = q(['one', 'two', 'three', 'four']);
    expect(shown(plain, undefined)).toBe(plain);
    expect(originalKey(undefined, 'C')).toBe('C');
  });
});
