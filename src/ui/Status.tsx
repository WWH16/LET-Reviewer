import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Announce = (message: string, undo?: () => void) => void;
const Ctx = createContext<Announce>(() => {});

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * One persistent status region for short confirmations ("Imported 48 items").
 * It stays in the DOM so screen readers always hear it (a11y R8).
 * Messages stay at least 6 seconds; one with Undo stays 10 seconds, and Ctrl+Z (Cmd+Z) runs it too.
 * Errors are never sent here: they are shown inline.
 */
export function StatusProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<(() => void) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    setMessage('');
    setUndo(null);
  }, []);

  const announce = useCallback<Announce>((m, onUndo) => {
    window.clearTimeout(timer.current);
    setMessage('');
    setUndo(null);
    // A fresh write makes screen readers repeat an identical message. A short timeout, not
    // requestAnimationFrame, so a throttled or background tab still shows it at once.
    window.setTimeout(() => {
      setMessage(m);
      if (onUndo) setUndo(() => onUndo);
    }, 50);
    timer.current = window.setTimeout(clear, onUndo ? 10000 : 6000);
  }, [clear]);

  const runUndo = useCallback(() => {
    undo?.();
    clear();
  }, [undo, clear]);

  useEffect(() => {
    if (!undo) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.matches('input, textarea, [contenteditable]');
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || typing) return;
      e.preventDefault();
      runUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, runUndo]);

  return (
    <Ctx.Provider value={announce}>
      {children}
      <div className={message ? 'toast' : 'toast is-empty'}>
        <span role="status" aria-live="polite">
          {message}
        </span>
        {undo && message && (
          <button type="button" className="toast-action" aria-keyshortcuts={mac ? 'Meta+Z' : 'Control+Z'} onClick={runUndo}>
            Undo
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useAnnounce = () => useContext(Ctx);
