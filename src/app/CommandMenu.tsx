import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { label: 'Study', to: '/' },
  { label: 'Quick 10', to: '/session?mode=quick' },
  { label: 'Missed questions', to: '/review' },
  { label: 'Timed quiz', to: '/session?mode=timed' },
  { label: 'Build your own', to: '/drill' },
  { label: 'Mock exam', to: '/mock' },
  { label: 'Stats', to: '/progress' },
  { label: 'Review', to: '/bank' },
  { label: 'Import questions', to: '/bank/import' },
  { label: 'Settings', to: '/settings' },
];

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const JUMP_KEYS = mac ? 'Meta+K' : 'Control+K';

/**
 * Jump list: Ctrl+K (Cmd+K on a Mac) or the "Go to" button opens it. A native modal dialog
 * holding a combobox: type to filter, arrows to move, Enter to go, Escape to close.
 * Focus returns to whatever opened it.
 */
export function CommandMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const id = useId();

  const open = () => {
    const d = ref.current;
    if (!d || d.open) return;
    opener.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    d.showModal();
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `open` touches only refs and state setters, so the first render's copy stays correct.
  }, []);

  const items = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));
  const current = Math.min(active, Math.max(0, items.length - 1));

  const go = (to: string) => {
    ref.current?.close();
    navigate(to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      setActive((current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (e.key === 'Enter' && items[current]) {
      e.preventDefault();
      go(items[current].to);
    }
  };

  return (
    <>
      <button type="button" className="top-jump only-wide" aria-keyshortcuts={JUMP_KEYS} onClick={open}>
        Go to
        <kbd>{mac ? 'Cmd K' : 'Ctrl K'}</kbd>
      </button>
      <dialog
        ref={ref}
        className="command"
        aria-label="Go to"
        onClose={() => opener.current?.focus()}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <input
          type="text"
          role="combobox"
          aria-label="Go to"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={items[current] ? `${id}-${current}` : undefined}
          aria-autocomplete="list"
          placeholder="Quick 10, Mock exam, Settings"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul id={`${id}-list`} role="listbox" aria-label="Screens" className="command-list">
          {items.map((c, i) => (
            <li
              key={c.to}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === current}
              onMouseMove={() => setActive(i)}
              onClick={() => go(c.to)}
            >
              {c.label}
            </li>
          ))}
          {!items.length && <li className="command-empty">No screen matches.</li>}
        </ul>
      </dialog>
    </>
  );
}
