import { expect, test } from 'vitest';
import { CORNERS, SHEET, TOP_MARK, bubbleAt, homography, readSheet } from './sheet';
import { KEYS, type Key } from './types';

type Pt = [number, number];
const W = 900, H = 800;
const PAPER = 205, INK = 45, PENCIL = 95, TABLE = 70;

/** Draws the sheet as a camera would see it: `quad` is where the four markers land in the photo. */
function photo(quad: Pt[], shaded: Record<number, { keys: Key[]; gray?: number }>, count: number) {
  const toSheet = homography(quad, CORNERS);
  const inSquare = (x: number, y: number, [cx, cy]: Pt) => Math.abs(x - cx) <= SHEET.mark / 2 && Math.abs(y - cy) <= SHEET.mark / 2;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const [x, y] = toSheet(px, py);
      let v = PAPER;
      if (x < -8 || y < -8 || x > SHEET.w + 8 || y > SHEET.h + 8) v = TABLE;
      else if ([...CORNERS, TOP_MARK].some((c) => inSquare(x, y, c))) v = INK;
      else {
        // Only the row under this pixel can hold it; checking every bubble per pixel takes a minute.
        const first = bubbleAt(1, 0), nextBlock = bubbleAt(26, 0), nextRow = bubbleAt(2, 0);
        const col = Math.floor((x - first.x + SHEET.r) / (nextBlock.x - first.x));
        const row = Math.round((y - first.y) / (nextRow.y - first.y));
        const n = col * 25 + row + 1;
        if (col >= 0 && row >= 0 && row < 25 && n <= count) {
          for (let k = 0; k < KEYS.length; k++) {
            const b = bubbleAt(n, k);
            const d = Math.hypot(x - b.x, y - b.y);
            if (d > SHEET.r) continue;
            const mark = shaded[n]?.keys.includes(KEYS[k]) ? (shaded[n].gray ?? PENCIL) : null;
            v = mark ?? (d > SHEET.r - 0.3 ? INK : PAPER);
          }
        }
      }
      data.set([v, v, v, 255], (py * W + px) * 4);
    }
  }
  return { data, width: W, height: H };
}

// A tilted, slightly keystoned shot, as from a hand-held phone.
const TILTED: Pt[] = [[110, 90], [800, 120], [770, 720], [90, 690]];
const turned = (q: Pt[], by: number) => q.map((_, i) => q[(i + by) % 4]);

const SHADED = { 1: { keys: ['A' as Key] }, 2: { keys: ['D' as Key] }, 26: { keys: ['C' as Key] }, 50: { keys: ['B' as Key] } };

test('reads shaded bubbles from a tilted photo, and blanks as blank', () => {
  const r = readSheet(photo(TILTED, SHADED, 50), 50);
  if (!r.ok) throw new Error('not read');
  expect(r.unclear).toEqual([]);
  expect(r.answers).toMatchObject({ 1: 'A', 2: 'D', 3: null, 26: 'C', 50: 'B' });
  expect(Object.keys(r.answers)).toHaveLength(50);
});

test('reads the same answers from a sideways and an upside-down photo', () => {
  for (const by of [1, 2, 3]) {
    const r = readSheet(photo(turned(TILTED, by), SHADED, 50), 50);
    expect(r.ok && r.answers[1], `turn ${by}`).toBe('A');
    expect(r.ok && r.answers[50], `turn ${by}`).toBe('B');
  }
});

test('flags double and faint marks instead of guessing', () => {
  const r = readSheet(photo(TILTED, { 4: { keys: ['A', 'B'] }, 7: { keys: ['C'], gray: 165 }, 9: { keys: ['D'] } }, 25), 25);
  if (!r.ok) throw new Error('not read');
  expect(r.unclear).toEqual([4, 7]);
  expect(r.answers[4]).toBeUndefined();
  expect(r.answers[9]).toBe('D');
});

test('rejects a photo with a corner marker cut off', () => {
  expect(readSheet(photo([[-40, 90], [800, 120], [770, 720], [-60, 690]], SHADED, 50), 50).ok).toBe(false);
});
