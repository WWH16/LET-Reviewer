import { KEYS, type Key } from './types';

/**
 * The printed answer sheet and its reader share this geometry. All numbers are millimetres, with the
 * origin at the centre of the top-left corner marker. Only proportions matter to the reader: the photo
 * is straightened from the four markers, so print scale and camera distance do not.
 */
export const SHEET = { w: 165, h: 145, mark: 5, r: 1.8 };
/** Six blocks of 25 rows fit the sheet. A longer exam prints, but cannot be scanned. */
export const MAX_SCAN_ITEMS = 150;
const ROWS = 25;
const BLOCK_W = 25.5;
const block = (n: number) => ({ x: 6 + Math.floor((n - 1) / ROWS) * BLOCK_W, y: 8 + ((n - 1) % ROWS) * 5.4 });

export const numberAt = (n: number) => ({ x: block(n).x + 3.5, y: block(n).y });
export const bubbleAt = (n: number, k: number) => ({ x: block(n).x + 8.5 + k * 4.6, y: block(n).y });
/** The four corner markers, clockwise from top-left, then the fifth mark that tells the top edge from the others. */
export const CORNERS: [number, number][] = [[0, 0], [SHEET.w, 0], [SHEET.w, SHEET.h], [0, SHEET.h]];
export const TOP_MARK: [number, number] = [SHEET.w / 2, 0];

// Reader tuning, on a 0 (paper) to 1 (marker black) scale, measured above the sheet's median bubble.
// Raise MARK if stray smudges read as answers; lower it if light pencil reads as blank.
const MARK = 0.35;
const WEAK = 0.18;

type Pt = [number, number];
export type Image = { data: ArrayLike<number>; width: number; height: number };
export type SheetRead = { ok: true; answers: Record<string, Key | null>; unclear: number[] } | { ok: false };

/** The projective map that sends each `from` point to its `to` point (four pairs). */
export function homography(from: Pt[], to: Pt[]): (x: number, y: number) => Pt {
  const m: number[][] = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i];
    m.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 9; k++) m[r][k] -= f * m[c][k];
    }
  }
  const h = m.map((row, i) => row[8] / row[i]);
  return (x, y) => {
    const d = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
  };
}

/**
 * Centres of the four dark, solid, squarish blobs nearest the photo's corners, clockwise from top-left.
 * ponytail: nearest-to-corner assumes the sheet fills most of the photo; a dark square object outside
 * the sheet can be picked instead, and the top-mark check then rejects the read. Upgrade path: choose the
 * four blobs that best fit one quadrilateral.
 */
function findMarkers(g: Uint8Array, w: number, h: number): Pt[] | null {
  let sum = 0;
  for (let i = 0; i < g.length; i++) sum += g[i];
  const dark = (sum / g.length) * 0.6;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const minArea = (Math.max(w, h) / 200) ** 2;
  const blobs: Pt[] = [];
  for (let i = 0; i < g.length; i++) {
    if (seen[i] || g[i] >= dark) continue;
    let sp = 0, area = 0, sx = 0, sy = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    stack[sp++] = i;
    seen[i] = 1;
    while (sp) {
      const p = stack[--sp];
      const x = p % w, y = (p - x) / w;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < g.length && !seen[q] && g[q] < dark) {
          seen[q] = 1;
          stack[sp++] = q;
        }
      }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const touchesEdge = x0 === 0 || y0 === 0 || x1 === w - 1 || y1 === h - 1;
    if (area < minArea || area > w * h * 0.01 || touchesEdge || bw > bh * 1.8 || bh > bw * 1.8 || area < bw * bh * 0.6) continue;
    blobs.push([sx / area, sy / area]);
  }
  const picked = ([[0, 0], [w, 0], [w, h], [0, h]] as Pt[]).map(([cx, cy]) => {
    let best = -1, bestD = Infinity;
    blobs.forEach(([x, y], i) => {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD) [best, bestD] = [i, d];
    });
    return best;
  });
  return new Set(picked).size === 4 && !picked.includes(-1) ? picked.map((i) => blobs[i]) : null;
}

/**
 * Reads a photo or scan of the printed answer sheet. `img` is RGBA pixels (canvas `ImageData`).
 * One clear mark in a row is the answer, no mark is a blank (`null`), and anything else (two marks,
 * a faint mark) is listed in `unclear` and left unanswered: a wrong guess would silently change a score.
 */
export function readSheet(img: Image, count: number): SheetRead {
  const { width: w, height: h } = img;
  const g = new Uint8Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = (img.data[i * 4] * 3 + img.data[i * 4 + 1] * 6 + img.data[i * 4 + 2]) / 10;
  const markers = findMarkers(g, w, h);
  if (!markers || count > MAX_SCAN_ITEMS) return { ok: false };

  // The photo may be sideways or upside down, so try each turn and keep the one with the top mark on top.
  for (let turn = 0; turn < 4; turn++) {
    const toPhoto = homography(CORNERS, CORNERS.map((_, i) => markers[(i + turn) % 4]));
    const gray = (x: number, y: number, r: number) => {
      let total = 0, n = 0;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx * dx + dy * dy > 5) continue;
          const [u, v] = toPhoto(x + (dx * r) / 2, y + (dy * r) / 2);
          const px = Math.round(u), py = Math.round(v);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          total += g[py * w + px];
          n++;
        }
      }
      return n ? total / n : 255;
    };
    const mean = (pts: Pt[]) => pts.reduce((s, [x, y]) => s + gray(x, y, 1.5), 0) / pts.length;
    const black = mean(CORNERS);
    const white = mean([[0, SHEET.h / 4], [0, (SHEET.h * 3) / 4], [SHEET.w, SHEET.h / 4], [SHEET.w, (SHEET.h * 3) / 4]]);
    if (white - black < 30) continue;
    const ink = (x: number, y: number, r: number) => (white - gray(x, y, r)) / (white - black);
    const otherEdges: Pt[] = [[SHEET.w / 2, SHEET.h], [0, SHEET.h / 2], [SHEET.w, SHEET.h / 2]];
    if (ink(...TOP_MARK, 1.5) < 0.5 || otherEdges.some(([x, y]) => ink(x, y, 1.5) > 0.3)) continue;

    const rows = Array.from({ length: count }, (_, i) => KEYS.map((_, k) => ink(bubbleAt(i + 1, k).x, bubbleAt(i + 1, k).y, SHEET.r * 0.6)));
    // Most bubbles are empty, so the median is an empty bubble: outline, printed letter and all.
    const empty = rows.flat().sort((a, b) => a - b)[Math.floor((count * KEYS.length) / 2)];
    const answers: Record<string, Key | null> = {};
    const unclear: number[] = [];
    rows.forEach((row, i) => {
      const marked = row.flatMap((v, k) => (v - empty >= MARK ? [KEYS[k]] : []));
      const faint = row.some((v) => v - empty >= WEAK && v - empty < MARK);
      if (marked.length === 1 && !faint) answers[String(i + 1)] = marked[0];
      else if (marked.length === 0 && !faint) answers[String(i + 1)] = null;
      else unclear.push(i + 1);
    });
    return { ok: true, answers, unclear };
  }
  return { ok: false };
}
