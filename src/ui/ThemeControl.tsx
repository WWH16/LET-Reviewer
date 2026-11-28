import { useId } from 'react';
import { Icon, type IconName } from './Icon';
import { setTheme, useTheme, type ThemePref } from './theme';

const OPTIONS: { id: ThemePref; label: string; icon: IconName }[] = [
  { id: 'system', label: 'System', icon: 'theme-system' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

/**
 * System, Light or Dark: three radios in one track, each with its word beside the icon, so arrow keys, screen
 * readers and touch all work as they do for any choice. `hint` says what System means (Settings shows it; the
 * side menu has no room for it).
 */
export function ThemeControl({ className, hint = true }: { className?: string; hint?: boolean }) {
  const pref = useTheme();
  const id = useId();
  return (
    <fieldset className={className ? `theme-pick ${className}` : 'theme-pick'} aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="label">Theme</legend>
      <div className="theme-track">
        {OPTIONS.map((o) => (
          <label key={o.id} className="theme-opt">
            <input type="radio" name={`theme-${id}`} className="sr-only" value={o.id} checked={pref === o.id} onChange={() => setTheme(o.id)} />
            <Icon name={o.icon} size={16} />
            {o.label}
          </label>
        ))}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="meta">
          System follows your phone or computer.
        </p>
      )}
    </fieldset>
  );
}
