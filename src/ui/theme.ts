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

/** Where a switch starts on screen: the toggle's centre, so the new theme grows out of the button pressed. */
export type ThemeOrigin = { x: number; y: number };

/**
 * Puts the theme on the page and the browser bar, as a view transition. From the toggle the new theme grows as a
 * circle out of the button over the old one; a switch the device makes, or any switch under reduced motion, is a
 * short cross-fade instead. Where view transitions are missing it changes at once.
 */
function apply(p: ThemePref, from?: ThemeOrigin) {
  const theme = resolveTheme(p, systemDark());
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const set = () => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[theme]);
    listeners.forEach((l) => l());
  };
  if (!document.startViewTransition) return set();
  const reveal = from && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add(reveal ? 'theme-reveal' : 'theme-fade');
  const t = document.startViewTransition(set);
  if (reveal) {
    const { x, y } = from;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    t.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => {});
  }
  // A second tap mid-switch skips this one; either way the classes go once it settles.
  t.finished.finally(() => root.classList.remove('theme-reveal', 'theme-fade')).catch(() => {});
}

let pref = read();

export function setTheme(p: ThemePref, from?: ThemeOrigin) {
  pref = p;
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* private mode: the choice lasts until the page closes */
  }
  apply(p, from);
}

// Under System, follow the device when it switches (sunset, a quick-settings toggle) while the app is open.
if (canMatch) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => pref === 'system' && apply(pref));

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
