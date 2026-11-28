import { Icon } from './Icon';
import { setTheme, useTheme } from './theme';

/**
 * One icon button beside the app's name: a moon while the page is light, a sun while it is dark, as GitHub and MDN
 * do. Screen readers hear a toggle, "Dark theme, pressed / not pressed". Until it is first used, the theme follows
 * the device; after that the choice is kept on this device.
 */
export function ThemeToggle() {
  const dark = useTheme() === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? 'Switch to light' : 'Switch to dark'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {/* Keyed on the theme, so the new icon turns in each time it changes. */}
      <span key={dark ? 'dark' : 'light'} className="theme-toggle-icon">
        <Icon name={dark ? 'sun' : 'moon'} size={20} />
      </span>
    </button>
  );
}
