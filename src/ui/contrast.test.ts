// Checks every color token pair in tokens.css against WCAG contrast minimums, in both themes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--(\w+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { light: tokens(':root {'), dark: tokens(":root[data-theme='dark']") };

describe.each(Object.entries(themes))('%s theme', (_name, t) => {
  it('has all five tokens', () => {
    expect(Object.keys(t).sort()).toEqual(['bg', 'control', 'fg', 'line', 'muted']);
  });
  it('body text and inverted blocks pass 4.5:1', () => expect(ratio(t.fg, t.bg)).toBeGreaterThanOrEqual(4.5));
  it('muted text passes 4.5:1', () => expect(ratio(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5));
  it('control borders pass 3:1', () => expect(ratio(t.control, t.bg)).toBeGreaterThanOrEqual(3));
});

it('the dark theme is written the same way in both places', () => {
  const start = css.indexOf('@media (prefers-color-scheme: dark)');
  const media = css.slice(start, css.indexOf(":root[data-theme='dark']"));
  for (const [k, v] of Object.entries(themes.dark)) expect(media).toContain(`--${k}: ${v}`);
});
