// The theme choice: what a saved value means, and which theme it shows.
import { describe, expect, it } from 'vitest';
import { parseTheme, resolveTheme } from './theme';

describe('theme', () => {
  it('reads a saved choice, and anything else as System', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('sepia')).toBe('system');
  });
  it('shows the chosen theme, or the device setting under System', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
