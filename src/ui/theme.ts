import { useSyncExternalStore } from 'react';

/**
 * Light or dark, per device: until she picks one with the toggle (System) the page follows the phone or computer;
 * a pick is kept. index.html sets the theme before the first paint (the same rules as below), so the page never
 * flashes the other one.
 */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'let-theme';
const BAR = { light: '#FAF9F5', dark: '#1C1512' };
const canMatch = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const systemDark = () => canMatch && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const parseTheme = (v: string | null): ThemePref => (v === 'light' || v === 'dark' ? v : 'system');
export const resolveTheme = (p: ThemePref, dark: boolean) => (p === 'system' ? (dark ? 'dark' : 'light') : p);

const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    return parseTheme(localStorage.getItem(KEY));
  } catch {
    return 'system';
  }
}

/** Puts the theme on the page and the browser bar. A cross-fade carries the change where motion is welcome. */
function apply(p: ThemePref, fade: boolean) {
  const theme = resolveTheme(p, systemDark());
  if (document.documentElement.dataset.theme === theme) return;
  const set = () => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[theme]);
    listeners.forEach((l) => l());
  };
  if (fade && document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.startViewTransition(set);
  else set();
}

let pref = read();

export function setTheme(p: ThemePref) {
  pref = p;
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* private mode: the choice lasts until the page closes */
  }
  apply(p, true);
}

// Under System, follow the device when it switches (sunset, a quick-settings toggle) while the app is open.
if (canMatch) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => pref === 'system' && apply(pref, true));

/** The theme on the page now, light or dark, kept in step as it changes. */
export function useTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  );
}
