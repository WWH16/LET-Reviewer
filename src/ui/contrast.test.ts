// Checks the colour token pairs in tokens.css against WCAG contrast minimums.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** Reads `--name: oklch(L% C H)` pairs from the first block that follows `selector`. */
function block(selector: string): Record<string, [number, number, number]> {
  const start = css.indexOf(selector);
  const body = css.slice(start, css.indexOf('}', start));
  const out: Record<string, [number, number, number]> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g)) out[m[1]] = [Number(m[2]) / 100, Number(m[3]), Number(m[4])];
  return out;
}

/** OKLCH to relative luminance, through OKLab and linear sRGB (clamped to the gamut). */
function luminance([L, C, h]: [number, number, number]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const ratio = (x: [number, number, number], y: [number, number, number]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

const light = block(':root {');
// The dark theme only redefines what changes, so it reads as the light tokens with its own on top.
const darkOwn = block(":root[data-theme='dark'] {");
const dark = { ...light, ...darkOwn };

it('reads the dark theme', () => {
  expect(Object.keys(darkOwn).length).toBeGreaterThan(25);
  expect(darkOwn['color-paper'][0]).toBeLessThan(0.3);
});

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme', (_, t) => {
  const pairs: [string, string, number][] = [
    ['color-ink', 'color-paper', 4.5],
    ['color-ink', 'color-card', 4.5],
    ['color-ink-2', 'color-paper-2', 4.5],
    ['color-muted', 'color-paper', 4.5],
    ['color-muted', 'color-paper-2', 4.5],
    ['color-accent-ink', 'color-accent', 4.5],
    ['color-button-ink', 'color-button', 4.5],
    ['color-inverse-ink', 'color-inverse', 4.5],
    ['color-inverse-muted', 'color-inverse', 4.5],
    ['color-inverse-ink', 'color-inverse-tint', 4.5],
    ['color-button-ink', 'color-button-deep', 4.5],
    ['color-accent-ink', 'color-accent-deep', 4.5],
    ['color-on-soft', 'color-accent-soft', 4.5],
    ['color-ink', 'color-paper-3', 4.5],
    // The streak calendar sets day numbers in ink on each activity shade.
    ['color-ink', 'heat-1', 4.5],
    ['color-ink', 'heat-2', 4.5],
    ['color-ink', 'heat-3', 4.5],
    ['color-ink', 'heat-4', 4.5],
    ['color-paper', 'color-ink', 4.5],
    ['color-accent-text', 'color-paper', 4.5],
    ['color-accent-text', 'color-card', 4.5],
    ['color-focus', 'color-paper', 3],
    // Running text is the softer brown, on the canvas and on the cream cards.
    ['color-ink-2', 'color-paper', 4.5],
    ['color-ink-2', 'color-card', 4.5],
    // Meta text and a field's edge sit on the cream cards.
    ['color-muted', 'color-card', 4.5],
    ['color-control', 'color-card', 3],
    ['color-accent-edge', 'color-card', 3],
    ['color-accent-edge', 'color-paper', 3],
    ['color-accent-edge', 'color-accent-soft', 3],
    ['color-accent-text', 'color-accent-soft', 4.5],
    // On the golden block the right/wrong/flag tones stand in for their fills (app.css), and the low timer is text.
    ['on-gold-warning', 'color-inverse', 4.5],
    ['on-gold-success', 'color-inverse', 3],
    ['on-gold-error', 'color-inverse', 3],
    // The golden block's own pills: butter on chocolate (the at-risk streak), and chocolate on gold.
    ['butter', 'chocolate', 4.5],
    ['chocolate', 'color-inverse', 4.5],
    // The focus ring on cards, and the clay outline against the ground.
    ['color-focus', 'color-card', 3],
    ['color-edge', 'color-paper', 1.5],
    // Light checks, crosses and flags (the canvas cream) sit on the state fills.
    ['color-paper', 'color-success-fill', 3],
    ['color-paper', 'color-error-fill', 3],
    ['color-paper', 'color-warning-fill', 3],
    // The rating's gold figure is 22px on a phone, under large-text size, so it needs 4.5:1.
    ['color-gold', 'color-card', 4.5],
  ];
  it.each(pairs)('%s on %s', (fg, bg, min) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});

